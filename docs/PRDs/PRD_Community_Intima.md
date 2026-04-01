# PRD — Community Intima (Gruppi Chiusi)

**Versione:** 1.0
**Data:** 2026-04-01
**Stato:** Pianificato — non ancora in sviluppo
**Feature ID:** CI-1

---

## Obiettivo

Trasformare BookSnap da app individuale a piattaforma famigliare/intima. Gli utenti possono creare **Gruppi chiusi** (famiglia, coppia, amici stretti) per condividere librerie, cercare libri nelle collezioni altrui, e gestire prestiti fisici — senza la complessita' di una community pubblica.

---

## Motivazione

La Fase 6 ha implementato una community globale (feed, trending, follow) che non rispecchia la vision del prodotto. Gli utenti di BookSnap sono lettori che vogliono sapere: "Mia moglie ha quel libro? Dove lo tiene? Posso prenderlo in prestito?" — non costruire un social network.

---

## Requisiti funzionali

| ID | Requisito | Priorita' |
|----|-----------|-----------|
| CI-1.1 | Creazione gruppo con nome, emoji, descrizione | P0 |
| CI-1.2 | Invito al gruppo via codice alfanumerico (6 char, scadenza 7 giorni) | P0 |
| CI-1.3 | Accettazione invito e join al gruppo | P0 |
| CI-1.4 | Visualizzazione membri del gruppo | P0 |
| CI-1.5 | Ricerca libri nelle librerie dei membri del gruppo | P0 |
| CI-1.6 | Visualizzazione "Chi ha questo libro" con location fisica | P0 |
| CI-1.7 | Richiesta prestito in-app ("Posso prendere X?") | P1 |
| CI-1.8 | Uscita dal gruppo / rimozione membro (solo owner) | P1 |
| CI-1.9 | Limite gruppi per utente: max 3 (espandibile in futuro) | P1 |
| CI-1.10 | Rating e recensioni visibili nel contesto del gruppo | P2 |

---

## Impatto su Database

### Nuovo modello: `Group`

```typescript
interface IGroup extends Document {
  name: string                          // es. "Famiglia Rossi"
  emoji?: string                        // es. "👨‍👩‍👧‍👦"
  description?: string
  ownerId: mongoose.Types.ObjectId      // chi ha creato il gruppo
  members: Array<{
    userId: mongoose.Types.ObjectId
    role: 'owner' | 'member'
    joinedAt: Date
  }>
  inviteCode?: string                   // codice alfanumerico 6 char
  inviteExpiresAt?: Date                // scadenza codice invito
  maxMembers: number                    // default 10, espandibile
  createdAt: Date
}
```

**Schema Mongoose:**
```typescript
const GroupSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  emoji: { type: String, maxlength: 4 },
  description: { type: String, maxlength: 200 },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  inviteCode: { type: String, unique: true, sparse: true },
  inviteExpiresAt: Date,
  maxMembers: { type: Number, default: 10 },
}, { timestamps: true })
```

**Indici:**
```
Group: { 'members.userId': 1 }    // per trovare i gruppi di un utente
Group: { inviteCode: 1 }          // unique sparse, per join via codice
Group: { ownerId: 1 }             // per trovare gruppi creati da un utente
```

### Modifiche a modelli esistenti

**Nessuna modifica a User, Library o Book.** Il gruppo e' un layer di accesso sopra i dati esistenti. L'isolamento dei dati e' gestito via query, non via duplicazione.

---

## Endpoint API

| Method | Route | Auth | Scopo |
|--------|-------|------|-------|
| POST | `/api/groups` | Si' | Crea un nuovo gruppo |
| GET | `/api/groups` | Si' | Lista gruppi dell'utente |
| GET | `/api/groups/[id]` | Si' | Dettaglio gruppo + membri |
| POST | `/api/groups/[id]/invite` | Si' | Genera codice invito (solo owner) |
| POST | `/api/groups/join` | Si' | Join via codice invito |
| DELETE | `/api/groups/[id]/members/[userId]` | Si' | Rimuovi membro (owner) o esci (self) |
| GET | `/api/groups/[id]/search?q=` | Si' | Cerca libri nelle librerie del gruppo |
| POST | `/api/groups/[id]/loan-request` | Si' | Richiesta prestito a un membro |

---

## Isolamento dati — Come cercare nelle librerie altrui senza scaricare tutto

Questo e' il punto architetturale critico. L'utente vuole cercare "Il nome del vento" e sapere se qualcuno nel gruppo ce l'ha — **senza** che il client scarichi tutte le librerie di tutti i membri.

### Approccio: Query server-side aggregata

```typescript
// GET /api/groups/[id]/search?q=tolkien

// 1. Verificare che l'utente autenticato sia membro del gruppo
const group = await Group.findOne({ _id: groupId, 'members.userId': userId })
if (!group) return 401

// 2. Estrarre tutti i userId del gruppo
const memberIds = group.members.map(m => m.userId)

// 3. Aggregation pipeline: cerca nelle librerie di TUTTI i membri
const results = await Library.aggregate([
  // Solo librerie dei membri del gruppo
  { $match: { userId: { $in: memberIds } } },
  
  // Esplodi l'array books
  { $unwind: '$books' },
  
  // Popola il book referenziato
  { $lookup: {
      from: 'books',
      localField: 'books.bookId',
      foreignField: '_id',
      as: 'bookData'
  }},
  { $unwind: '$bookData' },
  
  // Filtra per titolo/autore (text match)
  { $match: {
      $or: [
        { 'bookData.title': { $regex: query, $options: 'i' } },
        { 'bookData.authors': { $regex: query, $options: 'i' } }
      ]
  }},
  
  // Lookup username del proprietario
  { $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'owner',
      pipeline: [{ $project: { username: 1, avatar: 1 } }]
  }},
  { $unwind: '$owner' },
  
  // Raggruppa per libro (un libro puo' essere in piu' librerie)
  { $group: {
      _id: '$bookData._id',
      book: { $first: '$bookData' },
      owners: { $push: {
        userId: '$userId',
        username: '$owner.username',
        avatar: '$owner.avatar',
        location: '$books.location',
        behindRow: '$books.behindRow',
        status: '$books.status',
        rating: '$books.rating'
      }}
  }},
  
  { $limit: 20 }
])
```

**Risultato per il client:**
```json
{
  "results": [
    {
      "book": { "title": "Il Signore degli Anelli", "authors": ["J.R.R. Tolkien"], "coverUrl": "..." },
      "owners": [
        { "username": "moglie", "avatar": "...", "location": "Soggiorno", "status": "completed", "rating": 5 },
        { "username": "fratello", "avatar": "...", "location": "Camera", "status": "reading" }
      ]
    }
  ]
}
```

**Vantaggi:**
- Il client riceve SOLO i risultati filtrati, non l'intera libreria di nessuno
- La query e' eseguita interamente server-side in MongoDB
- L'aggregation pipeline usa gli indici esistenti
- Il campo `location` permette di sapere dove si trova fisicamente il libro

**Performance:**
- Con gruppi di 2-10 persone e librerie da 50-500 libri, la query e' rapida (< 200ms)
- L'indice text su `title` + `authors` di Book velocizza il match
- Se necessario, aggiungere un indice composto `Library: { userId: 1, 'books.bookId': 1 }`

---

## Step implementativi (testabili singolarmente)

### Step 1 — Modello Group + CRUD base

**Obiettivo:** Creare e gestire gruppi.

1. Creare `models/Group.ts` con schema e interfaccia
2. Creare `app/api/groups/route.ts`:
   - POST: crea gruppo (owner = utente autenticato, membro automatico)
   - GET: lista gruppi dell'utente (`Group.find({ 'members.userId': userId })`)
3. Creare `app/api/groups/[id]/route.ts`:
   - GET: dettaglio gruppo con membri (populate username/avatar)

**Verifica:** curl POST per creare gruppo, GET per listarlo, GET per dettaglio.

### Step 2 — Sistema inviti

**Obiettivo:** Invitare persone e farle entrare nel gruppo.

1. Creare `app/api/groups/[id]/invite/route.ts`:
   - POST: genera codice alfanumerico 6 char (`crypto.randomBytes(3).toString('hex')`), salva con scadenza 7 giorni
   - Solo l'owner puo' generare inviti
2. Creare `app/api/groups/join/route.ts`:
   - POST `{ code: "abc123" }`: cerca gruppo per `inviteCode`, verifica scadenza, aggiunge membro
   - Validazioni: codice valido, non scaduto, utente non gia' membro, gruppo non pieno

**Verifica:** Genera codice, usa codice per join da un altro utente, verifica che il membro appare nella lista.

### Step 3 — Ricerca nelle librerie del gruppo

**Obiettivo:** Cercare un libro e vedere chi ce l'ha.

1. Creare `app/api/groups/[id]/search/route.ts`:
   - GET `?q=tolkien`: aggregation pipeline come descritto sopra
   - Verificare che l'utente sia membro del gruppo
2. Risposta include: libro, proprietari con username/avatar/location/status

**Verifica:** Aggiungere libri a 2 utenti diversi nello stesso gruppo. Cercare un titolo condiviso. Verificare che entrambi i proprietari appaiano nei risultati.

### Step 4 — UI Gruppi

**Obiettivo:** Interfaccia per gestire i gruppi e cercare.

1. Pagina `/groups` (o sezione in profilo): lista gruppi, crea gruppo, join via codice
2. Pagina `/groups/[id]`: dettaglio gruppo, membri, search bar
3. Risultati ricerca: card libro con "Disponibile da: [avatar] [username] — [location]"

### Step 5 — Richiesta prestito

**Obiettivo:** Un membro puo' richiedere un libro a un altro membro.

1. `POST /api/groups/[id]/loan-request`: `{ bookId, toUserId, message? }`
2. Notifica in-app al proprietario: "[username] vorrebbe prendere in prestito [libro]"
3. Il proprietario puo' accettare → lo status del suo BookEntry diventa `lent` con `lentTo` = richiedente

---

## Privacy e sicurezza

- Un utente vede le librerie degli altri SOLO se fanno parte dello stesso gruppo
- La query server-side filtra rigidamente per `memberIds` — non e' possibile cercare nelle librerie di utenti fuori dal gruppo
- L'owner del gruppo puo' rimuovere membri. Un membro puo' uscire autonomamente
- I codici invito scadono dopo 7 giorni e sono monouso (opzionale: multi-uso con limite)
- Limite gruppi per utente: 3 (previene abuso; alzabile in futuro)

---

## Migrazione dal codice Fase 6

| Feature Fase 6 | Destino |
|-----------------|---------|
| Follow system (SO-3) | **Preservare.** Il concetto di "seguire" puo' evolvere in "membro del gruppo" |
| Activity feed (SO-4) | **Deprecare.** Sostituire con feed del gruppo (attivita' solo dei membri) |
| Trending globale (SO-6) | **Sostituire** con Super Trending (TR-1, fonti esterne) |
| Reading challenges (SO-7) | **Migrare** a challenges di gruppo (es. "Leggiamo tutti X questo mese") |
| Public profiles (SO-2) | **Opzionale.** Tenere per chi vuole un profilo visibile fuori dal gruppo |

---

## Non in scope (v1)

- Chat/messaggistica nel gruppo (troppo complesso, usare WhatsApp/Telegram)
- Librerie condivise (un unico scaffale per il gruppo) — ogni membro ha la propria libreria, la condivisione e' in sola lettura
- Acquisto/vendita tra membri
- Gruppi pubblici/aperti
