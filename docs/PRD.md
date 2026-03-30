# BookSnap PRD - Ricerca, Personalizzazione e Raccomandazioni

**Versione:** 1.1
**Data:** 2026-03-30
**Stato:** Attivo — Fase 2 completata, Fase 3 in corso

---

## Obiettivo

Trasformare BookSnap da semplice catalogo di libri a piattaforma intelligente che conosce i gusti dell'utente, offre raccomandazioni personalizzate e fornisce strumenti di ricerca avanzati.

---

## Feature Map

| ID | Feature | Priorità | Effort | Dipendenze |
|----|---------|----------|--------|------------|
| **AUTH** | | | | |
| AU-1 | ✅ Google OAuth — API backend (callback, token exchange) | P0 | M | - |
| AU-2 | ✅ Google OAuth — UI (bottone login/register) | P0 | S | AU-1 |
| AU-3 | ✅ Google OAuth — Account linking (match email esistente) | P0 | S | AU-1 |
| AU-4 | ✅ Google OAuth — Avatar e info profilo da Google | P1 | S | AU-1 |
| **TASTE PROFILE** | | | | |
| TP-1 | ✅ Taste Profile Engine | P0 | M | - |
| TP-2 | ✅ Taste Profile API | P0 | S | TP-1 |
| **RACCOMANDAZIONI** | | | | |
| RC-1 | ✅ Prompt Assistant potenziato | P0 | S | TP-2 |
| RC-2 | ✅ Raccomandazioni proattive (Home) | P1 | L | TP-2 |
| RC-3 | ✅ "Perché questo libro" (spiegazione match) | P1 | S | RC-1 |
| **RICERCA** | | | | |
| SR-1 | ✅ Ricerca con filtri (genere, anno, lingua, pagine) | P1 | M | - |
| SR-2 | ✅ Ricerca nella propria libreria | P1 | M | - |
| SR-3 | ✅ Fuzzy matching / tolleranza typo | P2 | M | - |
| SR-4 | Autocomplete nella ricerca | P2 | S | - |
| SR-5 | Libri simili ("Chi ha letto X ha letto anche Y") | P2 | L | TP-1 |
| **STATISTICHE** | | | | |
| ST-1 | ✅ Dashboard statistiche lettura | P1 | M | - |
| ST-2 | Distribuzione generi (grafico) | P2 | S | ST-1 |
| ST-3 | Reading pace e streak | P2 | S | ST-1 |
| **PROFILO** | | | | |
| PR-1 | ✅ Pagina profilo gusti (visualizzazione taste profile) | P1 | M | TP-2 |
| PR-2 | Override manuale generi preferiti | P2 | S | PR-1 |

| **UI/UX IMPROVEMENTS** | | | | |
| UI-1 | ✅ Rec. proattive — card book-card style (copertina + titolo + autore) | P1 | S | RC-2 |
| UI-2 | ✅ Rec. proattive — filtro libri già in libreria (no duplicati) | P1 | S | RC-2 |
| UI-3 | ✅ Book detail — Aggiunta alla libreria con scelta stato | P1 | M | - |
| UI-4 | ✅ Book detail — Hero con copertina galleggiante su sfondo sfocato | P1 | S | - |
| UI-5 | Scan page — revisione layout e UX | P2 | M | - |
| UI-6 | Navigazione — BottomNav punta a /assistant (chat) e /search (ricerca) | P1 | S | - |
**Legenda Priorità:** P0 = Must have (fase 1), P1 = Should have (fase 2), P2 = Nice to have (fase 3)

---

## Fasi di rilascio

### Fase 1 — Fondamenta intelligenti (P0) ✅ COMPLETATA
> ~~AU-1, AU-2, AU-3, TP-1, TP-2, RC-1~~

### Fase 2 — Esperienza utente arricchita (P1) ✅ COMPLETATA
> ~~AU-4, RC-2, RC-3, SR-1, SR-2, ST-1, PR-1~~
> ~~UI-1, UI-2, UI-3, UI-4, UI-6~~

### Fase 3 — Polish e discovery avanzata (P2)
> ~~SR-3~~, SR-4, SR-5, ST-2, ST-3, PR-2, UI-5

---

## Changelog

### v1.1 — 2026-03-30
- **UI-1:** Raccomandazioni ridisegnate come book card (copertina 2:3 + titolo + autore) con scroll orizzontale, pulsante "+" sovrapposto sulla cover per aggiunta rapida
- **UI-2:** API `/api/recommendations` ora esclude dalla risposta i libri già presenti nella libreria utente — doppio filtro (prompt LLM + post-processing server)
- **UI-3:** Pagina `/book/[id]` arricchita con sezione "Aggiungi alla libreria" per i libri non ancora aggiunti: scelta dello stato (Da leggere / In lettura / ecc.) e conferma
- **UI-4:** Hero della pagina dettaglio libro completamente ridisegnata — copertina sfocata full-bleed come sfondo, copertina originale galleggiante con ombra e bordo vetro
- **UI-6:** BottomNav aggiornata — `/search` ora ospita la Ricerca con filtri, `/assistant` ospita il Bibliotecario AI (chat)

---

## Dettaglio Feature

---

### AU-1: Google OAuth — API backend

**Descrizione:**
Implementare il flusso OAuth 2.0 con Google per login e registrazione. Nessuna libreria esterna (no NextAuth/Auth.js) — implementazione manuale con le API Google per mantenere il controllo sul flusso JWT esistente.

**Flusso completo:**

```
1. Client: click "Accedi con Google"
2. Client: redirect a Google OAuth consent screen
   GET https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=GOOGLE_CLIENT_ID
     &redirect_uri=NEXT_PUBLIC_APP_URL/api/auth/google/callback
     &response_type=code
     &scope=openid email profile
     &prompt=select_account

3. Google: utente autorizza → redirect a callback con ?code=...

4. Server (callback route): scambia code per tokens
   POST https://oauth2.googleapis.com/token
     { code, client_id, client_secret, redirect_uri, grant_type: authorization_code }

5. Server: decodifica id_token (JWT Google) → estrae email, name, picture, sub (Google ID)

6. Server: logica di match/creazione utente (vedi AU-3)

7. Server: genera JWT BookSnap, setta cookie HttpOnly, redirect a /library
```

**Nuovi endpoint:**

| Method | Route | Scopo |
|--------|-------|-------|
| GET | `/api/auth/google` | Genera URL di autorizzazione Google e redirect |
| GET | `/api/auth/google/callback` | Riceve il code, scambia per token, login/register, redirect |

**Env variables necessarie:**
```env
GOOGLE_CLIENT_ID=           # Da Google Cloud Console
GOOGLE_CLIENT_SECRET=       # Da Google Cloud Console
```

**Configurazione Google Cloud Console:**
- Authorized redirect URI: `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
- Scopes: `openid`, `email`, `profile`

**Implementazione `/api/auth/google/route.ts`:**
```typescript
// Genera l'URL OAuth e fa redirect
export async function GET(request: NextRequest) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
```

**Implementazione `/api/auth/google/callback/route.ts`:**
```typescript
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) → redirect /login?error=google_failed

  // 1. Scambia code per tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })
  const { id_token } = await tokenRes.json()

  // 2. Decodifica id_token (JWT) — no verifica firma, Google lo ha appena emesso
  const payload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString())
  const { email, name, picture, sub: googleId } = payload

  // 3. Match/creazione utente (AU-3)
  // 4. Genera JWT BookSnap, setta cookie, redirect /library
}
```

**Sicurezza:**
- Validare che `code` sia presente e non vuoto
- Il `client_secret` resta solo server-side (mai esposto al client)
- Aggiungere parametro `state` con token CSRF per prevenire attacchi (generato prima del redirect, verificato al callback)
- id_token decodificato senza verifica firma è accettabile perché ricevuto direttamente da Google via HTTPS nel token exchange

---

### AU-2: Google OAuth — UI (bottone login/register)

**Descrizione:**
Aggiungere il bottone "Accedi con Google" nelle pagine login e register.

**UI:**
- Bottone con logo Google SVG + testo "Accedi con Google"
- Posizionato sotto il form esistente, separato da divider "oppure"
- Stile: bordo grigio, sfondo bianco, testo scuro (seguire Google branding guidelines)
- Il bottone è un semplice link/redirect a `/api/auth/google`

**Modifiche file:**
- `app/(auth)/login/page.tsx` — aggiungere bottone + divider dopo il form
- `app/(auth)/register/page.tsx` — stesso bottone + divider
- `app/(auth)/login/auth.module.css` — stili per divider e bottone Google

**Layout nella pagina login:**
```
[Form email/password]
[Bottone "Accedi"]

─── oppure ───

[🔵 Accedi con Google]

Non hai un account? Registrati
```

**Layout nella pagina register:**
```
[Form username/email/password]
[Bottone "Crea account"]

─── oppure ───

[🔵 Registrati con Google]

Hai già un account? Accedi
```

**Gestione errori:**
- Se il callback Google fallisce, redirect a `/login?error=google_failed`
- La pagina login legge il query param `error` e mostra: "Accesso con Google non riuscito. Riprova."

---

### AU-3: Google OAuth — Account linking (match email esistente)

**Descrizione:**
Logica di match tra account Google e account BookSnap esistenti. Questo è il punto critico per la persistenza: un utente che si è registrato con email/password deve poter fare login anche con Google (e viceversa) se l'email corrisponde.

**Logica nel callback (step 3 di AU-1):**

```
Ricevi da Google: { email, name, picture, googleId }

1. Cerca utente per googleId:
   user = User.findOne({ googleId })

   → SE TROVATO: login diretto (utente già collegato)
     Genera JWT, setta cookie, redirect /library

2. Cerca utente per email:
   user = User.findOne({ email })

   → SE TROVATO (account email/password esistente):
     - Collega Google: user.googleId = googleId
     - Aggiorna avatar se mancante: user.avatar = picture
     - user.save()
     - Login diretto
     → L'utente potrà fare login sia con password che con Google

   → SE NON TROVATO: nuovo utente
     - Genera username da name Google (es. "Mario Rossi" → "mario_rossi")
     - Se username già in uso, appendi numero random (mario_rossi_42)
     - Crea utente SENZA passwordHash (campo diventa opzionale)
     - Crea libreria di default
     - Login diretto
```

**Modifiche al modello User:**
```typescript
// Nuovi campi in UserSchema
googleId: { type: String, unique: true, sparse: true }  // sparse = consente null multipli
authProvider: { type: String, enum: ['local', 'google', 'both'], default: 'local' }
```

**Aggiornamento interfaccia IUser:**
```typescript
export interface IUser extends Document {
  email: string
  username: string
  passwordHash?: string     // Diventa opzionale (utenti solo-Google non ce l'hanno)
  googleId?: string         // ID univoco Google
  authProvider: 'local' | 'google' | 'both'
  avatar?: string
  bio?: string
  preferences: { ... }
  createdAt: Date
}
```

**Casi edge:**
| Scenario | Comportamento |
|----------|--------------|
| Utente registrato con email, fa login Google con stessa email | Account collegato automaticamente. `authProvider` → `'both'` |
| Utente registrato con Google, prova login email/password | Fallisce (non ha password). Mostrare: "Questo account usa Google. Accedi con Google." |
| Utente registrato con Google, vuole aggiungere password | Futura feature (non in scope). Per ora login solo via Google. |
| Due email diverse (Google vs registrazione) | Account separati, nessun conflitto |

**Modifica al login email/password (`/api/auth/login`):**
- Aggiungere check: se utente trovato ma `passwordHash` è vuoto/undefined → rispondere con errore specifico: `"Questo account utilizza Google per l'accesso. Usa il bottone 'Accedi con Google'."`

---

### AU-4: Google OAuth — Avatar e info profilo da Google

**Descrizione:**
Utilizzare la foto profilo e il nome di Google per arricchire il profilo utente.

**Comportamento:**
- Al primo login Google: salvare `picture` come `avatar` e `name` come `username` (se non già presente)
- Ai login successivi: aggiornare avatar solo se l'utente non l'ha mai modificato manualmente
- Aggiungere flag `avatarCustomized: boolean` al modello User per distinguere avatar scelti manualmente

**Dove mostrare l'avatar:**
- Header/navbar (se presente)
- Pagina profilo
- Eventuali future feature social

**Note:**
- L'URL dell'avatar Google (`lh3.googleusercontent.com/...`) è pubblico e stabile
- Non serve scaricare/salvare l'immagine, basta l'URL
- Se l'utente cambia foto su Google, si aggiorna al prossimo login

---

**Descrizione:**
Modulo server-side che analizza la libreria dell'utente e genera un profilo dei gusti strutturato. Il profilo viene calcolato on-demand (non cached inizialmente) leggendo i BookEntry dell'utente.

**Input:**
- Tutti i libri nelle librerie dell'utente con: generi, rating, status, date (addedAt, startedAt, finishedAt)

**Output — Taste Profile Object:**
```typescript
interface TasteProfile {
  // Generi pesati per rating e frequenza
  genreAffinities: Array<{
    genre: string
    score: number        // 0-100, normalizzato
    bookCount: number
    avgRating: number    // media rating utente per quel genere
  }>

  // Autori più apprezzati (rating >= 4 o più libri letti)
  favoriteAuthors: Array<{
    name: string
    bookCount: number
    avgRating: number
  }>

  // Libri recenti completati (ultimi 5)
  recentlyCompleted: Array<{
    title: string
    author: string
    rating?: number
    genres: string[]
  }>

  // Libri attualmente in lettura
  currentlyReading: Array<{
    title: string
    author: string
  }>

  // Statistiche generali
  stats: {
    totalBooks: number
    completedBooks: number
    avgRating: number           // media globale rating dati dall'utente
    preferredPageRange: string  // es. "200-400 pagine"
    topGenres: string[]         // top 3 generi
  }
}
```

**Algoritmo di scoring generi:**
1. Per ogni libro in libreria, prendi i generi associati
2. Peso base = 1 per ogni occorrenza
3. Moltiplicatori:
   - `completed` + rating 5 → x3.0
   - `completed` + rating 4 → x2.5
   - `completed` + rating 3 → x1.5
   - `completed` senza rating → x1.5
   - `reading` → x2.0 (interesse attivo)
   - `to_read` → x1.0 (interesse dichiarato)
   - `abandoned` → x0.3 (penalità)
   - `lent` → x1.5 (abbastanza buono da prestare)
4. Bonus recency: libri degli ultimi 3 mesi → x1.5 aggiuntivo
5. Normalizza i punteggi a 0-100

**Posizione nel codice:**
- Nuovo file: `lib/tasteProfile.ts`
- Funzione principale: `buildTasteProfile(userId: string): Promise<TasteProfile>`

**Note tecniche:**
- Prima iterazione: calcolo on-demand ad ogni richiesta. Se diventa lento (> 500ms con librerie grandi), aggiungere cache con TTL di 1 ora
- Richiede population dei bookId nei BookEntry per accedere a generi e autori

---

### TP-2: Taste Profile API

**Descrizione:**
Endpoint REST che espone il taste profile calcolato per l'utente autenticato.

**Endpoint:**
```
GET /api/profile/taste
```

**Response:**
```json
{
  "profile": { /* TasteProfile object */ }
}
```

**Auth:** Richiesta (401 se non autenticato)

**Note:**
- Usato internamente dall'assistant (RC-1) e dalla UI del profilo (PR-1)
- Non espone dati sensibili, solo aggregati

---

### RC-1: Prompt Assistant potenziato

**Descrizione:**
Arricchire il prompt del Bibliotecario AI con il taste profile dell'utente per raccomandazioni realmente personalizzate.

**Stato attuale del prompt:**
- Riceve lista piatta dei titoli in libreria ("L'utente possiede già questi libri")
- Istruzione generica "non consigliare libri già in lista"

**Nuovo prompt — blocco contesto utente:**
```
PROFILO LETTORE:
- Generi preferiti: Fantasy (score 85, 8 libri, rating medio 4.5), Fantascienza (score 62, 4 libri, rating medio 4.0)
- Generi meno apprezzati: Thriller (score 15, 2 libri, rating medio 2.5)
- Autori preferiti: Brandon Sanderson (3 libri, rating 5.0), Ursula K. Le Guin (2 libri, rating 4.5)
- Letture recenti completate: "Il nome del vento" (rating 5), "Dune" (rating 4)
- Sta leggendo: "La via dei re"
- Statistiche: 25 libri totali, rating medio dato 3.8, preferisce libri 300-500 pagine

REGOLE PERSONALIZZAZIONE:
- Favorisci raccomandazioni nei generi con score alto, MA suggerisci anche 1 libro "fuori zona" se pertinente alla query
- Se l'utente chiede genericamente "cosa leggere", usa il profilo per guidare i suggerimenti
- Evita generi con score < 20 a meno che l'utente li chieda esplicitamente
- Tieni conto delle letture recenti per evitare ridondanza tematica
```

**Modifiche al codice:**
- File: `app/api/assistant/route.ts`
- Import `buildTasteProfile` da `lib/tasteProfile.ts`
- Calcolare il profilo prima di costruire il prompt
- Aggiungere il blocco contesto al prompt template `ASSISTANT_PROMPT`

---

### RC-2: Raccomandazioni proattive (Home)

**Descrizione:**
Sezione "Consigliati per te" visibile nella pagina libreria o in una nuova home page, senza dover aprire la chat. Mostra 3-5 libri suggeriti basati sul taste profile.

**UX:**
- Card orizzontali scrollabili con copertina, titolo, autore, motivo del suggerimento
- Refresh manuale con bottone "Nuovi suggerimenti"
- Click sulla card → pagina dettaglio libro con possibilità di aggiungere alla libreria

**Implementazione:**
- Nuovo endpoint: `GET /api/recommendations`
- Usa `buildTasteProfile` + chiamata LLM con prompt dedicato (più corto del chat assistant)
- Cache lato server: suggerimenti validi per 24h o fino a cambio libreria
- Fallback: se libreria vuota, mostra "libri popolari" o suggerimenti generici

**Prompt dedicato:**
```
Dato questo profilo lettore: [taste profile sintetico]
Suggerisci 5 libri che l'utente potrebbe amare.
3 nei suoi generi preferiti, 1 scoperta in un genere adiacente, 1 classico che potrebbe non conoscere.
Per ogni libro spiega in 1 frase perché lo consigli a QUESTO utente specifico.
```

---

### RC-3: "Perché questo libro" (spiegazione match)

**Descrizione:**
Ogni libro consigliato dall'assistant include un campo `matchReason` che spiega perché è stato scelto per quell'utente specifico.

**Modifica al prompt LLM:**
Aggiungere al JSON di output:
```json
{
  "title": "...",
  "matchReason": "Consigliato perché ami il worldbuilding complesso di Sanderson e questo ha un sistema magico altrettanto elaborato"
}
```

**UI:**
- Sotto la descrizione nella book card, testo in italic più piccolo con icona lampadina
- Colore: `--text-secondary`

---

### SR-1: Ricerca con filtri

**Descrizione:**
Aggiungere filtri combinabili alla ricerca libri nel DB locale.

**Filtri disponibili:**
| Filtro | Tipo | Valori |
|--------|------|--------|
| Genere | Multi-select | Lista generi presenti nel DB |
| Anno pubblicazione | Range | Da-A (es. 2000-2024) |
| Lingua | Select | it, en, fr, de, es, altro |
| Numero pagine | Range presets | < 200, 200-400, 400-600, > 600 |
| Rating medio | Min | >= 3, >= 4, >= 4.5 |

**API:**
```
GET /api/books?q=fantasy&genre=Fantascienza&yearFrom=2000&yearTo=2024&lang=it&pagesMin=200&pagesMax=400
```

**Modifiche:**
- File: `app/api/books/route.ts` — aggiungere parsing filtri e query MongoDB composita
- File: `app/(app)/search/page.tsx` o nuovo componente filtri — UI filtri espandibile
- Nuovi indici MongoDB se necessario: `genres`, `language`, `pageCount`, `publishedYear`

**UI filtri:**
- Barra filtri collassabile sotto la search bar
- Chips per filtri attivi con X per rimuovere
- Contatore risultati

---

### SR-2: Ricerca nella propria libreria

**Descrizione:**
Permettere all'utente di cercare e filtrare i libri nella propria libreria.

**Filtri specifici libreria (oltre a quelli di SR-1):**
| Filtro | Tipo | Valori |
|--------|------|--------|
| Status | Multi-select | Da leggere, In lettura, Completato, Abbandonato, Prestato |
| Rating personale | Min | 1-5 stelle |
| Tags | Multi-select | Tag definiti dall'utente |
| Libreria | Select | Se l'utente ha più librerie |

**API:**
```
GET /api/libraries/search?q=tolkien&status=completed&rating=4&tag=fantasy
```

**UI:**
- Nella pagina libreria, search bar + filtri sopra la lista libri
- Toggle "Cerca nei miei libri" / "Cerca tutti i libri"

---

### SR-3: Fuzzy matching

**Descrizione:**
Tolleranza per errori di battitura nella ricerca. "Tolkin" deve trovare "Tolkien", "Fantascenza" deve matchare "Fantascienza".

**Approccio tecnico:**
- Opzione A: MongoDB Atlas Search con fuzzy (richiede Atlas M10+, non free tier)
- Opzione B: Levenshtein distance lato applicazione sui risultati `$text`
- Opzione C: Regex con pattern generati (es. "tol.?k.?en") — semplice ma limitato

**Raccomandazione:** Partire con Opzione B (post-filtering con Levenshtein) che funziona su qualsiasi tier MongoDB. Se si migra ad Atlas Search in futuro, usare il fuzzy nativo.

---

### SR-4: Autocomplete nella ricerca

**Descrizione:**
Suggerimenti in tempo reale mentre l'utente digita nella search bar.

**Implementazione:**
- Endpoint dedicato: `GET /api/books/autocomplete?q=fan&limit=5`
- Query: regex prefix match su titolo (`^fan.*`, case insensitive)
- Debounce client-side: 300ms
- Mostra: titolo + autore + copertina piccola
- Click sul suggerimento → naviga alla pagina del libro

**Ottimizzazione:**
- Indice MongoDB su `title` (già esiste text index)
- Risposta leggera: solo `_id`, `title`, `authors[0]`, `coverUrl`

---

### SR-5: Libri simili

**Descrizione:**
Nella pagina dettaglio libro, sezione "Libri simili" con 3-5 suggerimenti.

**Algoritmo:**
1. Prendi generi e autori del libro corrente
2. Cerca nel DB locale libri con generi in comune (ordinati per overlap)
3. Se < 3 risultati, chiama LLM: "Suggerisci 5 libri simili a [titolo] di [autore]"
4. Arricchisci con metadata esterne

**UI:**
- Carousel orizzontale di copertine nella pagina `book/[id]`
- Click → naviga al libro suggerito

---

### ST-1: Dashboard statistiche lettura

**Descrizione:**
Pagina o sezione nel profilo con statistiche aggregate sulla lettura dell'utente.

**Metriche:**
| Metrica | Calcolo |
|---------|---------|
| Libri completati (anno corrente) | Count status=completed, finishedAt nel 2026 |
| Libri completati (totale) | Count status=completed |
| Pagine totali lette | Sum pageCount dei libri completed |
| Rating medio dato | Avg rating dove rating != null |
| Genere più letto | Genere con più libri completed |
| Autore più letto | Autore con più libri in libreria |
| Libri in lettura | Count status=reading |
| Libri in coda | Count status=to_read |

**API:**
```
GET /api/profile/stats
```

**UI:**
- Card grid nella pagina profilo
- Numeri grandi con label sotto
- Icone per ogni metrica

---

### ST-2: Distribuzione generi (grafico)

**Descrizione:**
Grafico a ciambella/radar che mostra la distribuzione dei generi nella libreria dell'utente.

**Implementazione:**
- Libreria grafica leggera: Chart.js o recharts (valutare bundle size)
- Alternativa zero-dependency: SVG generato server-side o con CSS puro
- Dati dal taste profile (genreAffinities)

**UI:**
- Nella pagina profilo sotto le statistiche
- Colori diversi per genere
- Hover/tap mostra dettaglio (X libri, rating medio Y)

---

### ST-3: Reading pace e streak

**Descrizione:**
Tracking del ritmo di lettura e streak (giorni consecutivi di lettura).

**Note:**
- Il modello attuale NON traccia l'attività giornaliera, solo startedAt/finishedAt
- Per lo streak serve un nuovo modello o campo: `ReadingActivity` con date di interazione
- Alternativa semplificata: calcolare solo il pace (tempo medio tra startedAt e finishedAt dei libri completati)

**Pace (implementabile subito):**
```
tempo_medio = avg(finishedAt - startedAt) per libri con entrambe le date
```

**Streak (richiede nuovo tracking):**
- Nuovo modello `ReadingLog`: `{ userId, date, bookId, pagesRead? }`
- L'utente logga manualmente o il sistema registra quando apre un libro
- Complessità alta → P2

---

### PR-1: Pagina profilo gusti

**Descrizione:**
Visualizzazione del taste profile nella pagina profilo, così l'utente vede come il sistema lo "conosce".

**Sezioni:**
1. **I tuoi generi** — barre orizzontali con score, colorate per affinità
2. **I tuoi autori** — lista top 5 con numero libri e rating medio
3. **Letture recenti** — mini copertine degli ultimi completati
4. **Il tuo profilo in sintesi** — frase generata: "Sei un lettore di fantasy e fantascienza, ami il worldbuilding complesso e leggi circa 2 libri al mese"

**UI:**
- Integrata nella pagina profilo esistente (`app/(app)/profile/page.tsx`)
- Sotto le info utente, sopra le preferenze manuali

---

### PR-2: Override manuale generi preferiti

**Descrizione:**
Permettere all'utente di correggere il profilo automatico. Es. "il sistema dice che amo i thriller perché ne ho tanti, ma in realtà li leggo per lavoro".

**Implementazione:**
- Nella pagina profilo gusti, ogni genere ha un toggle "Questo mi piace davvero" / "Non è un mio genere"
- Override salvati in `User.preferences.genreOverrides: { [genre: string]: 'boost' | 'suppress' }`
- Il taste profile engine applica gli override come moltiplicatore finale (boost = x2, suppress = x0.1)

---

## Modello dati — Modifiche necessarie

### Modifiche User (AU-1, AU-3, AU-4)
```typescript
// Nuovi campi
googleId?: string                // AU-3: ID univoco Google, indice unique sparse
authProvider: 'local' | 'google' | 'both'  // AU-3: metodo di autenticazione
avatarCustomized?: boolean       // AU-4: true se l'utente ha cambiato avatar manualmente

// Campi modificati
passwordHash?: string            // AU-3: diventa opzionale (utenti solo-Google)

// Campi esistenti
preferences: {
  favoriteGenres: string[]       // esistente, diventa secondario
  genreOverrides: Map<string, 'boost' | 'suppress'>  // PR-2
  language: string               // esistente
  theme: 'dark' | 'light'       // esistente
}
```

### Nuovi indici User
```
User: { googleId: 1 }   // unique, sparse — per lookup veloce al login Google
```

### Nuovo modello (opzionale, per ST-3)
```typescript
// ReadingLog — solo se si implementa lo streak
interface IReadingLog {
  userId: ObjectId
  bookId: ObjectId
  date: Date          // solo giorno, senza ora
  pagesRead?: number
}
```

### Nuovi indici MongoDB
```
Book: { genres: 1 }              // SR-1: filtro per genere
Book: { language: 1 }            // SR-1: filtro per lingua
Book: { publishedYear: 1 }       // SR-1: filtro per anno
Book: { pageCount: 1 }           // SR-1: filtro per pagine
```

---

## Rischi e considerazioni

| Rischio | Mitigazione |
|---------|-------------|
| Google OAuth: utente si aspetta di poter aggiungere password dopo registrazione Google | Per ora non supportato. Comunicare chiaramente in UI. Pianificare come feature futura. |
| Google OAuth: cambio email su Google dopo linking | Il match è su `googleId`, non su email. L'email nel DB BookSnap resta quella originale. |
| Google OAuth: `client_secret` esposto | È solo in env server-side. Mai incluso in bundle client. Verificare che non finisca in `NEXT_PUBLIC_*`. |
| Google OAuth: CSRF sul callback | Implementare parametro `state` con token random, salvato in cookie temporaneo, verificato al callback. |
| Taste profile lento con librerie grandi (100+ libri) | Calcolo on-demand con cache TTL 1h. Indici MongoDB. |
| LLM non rispetta il profilo nel prompt | Testare con diversi modelli. Strutturare il prompt con sezioni chiare. |
| Costi OpenRouter per raccomandazioni proattive | Cache 24h per RC-2. Limitare a 1 refresh/giorno. |
| Bundle size con libreria grafici (ST-2) | Valutare SVG puro vs Chart.js. Lazy load del componente. |
| MongoDB free tier limiti per Atlas Search (SR-3) | Usare fuzzy lato applicazione, non Atlas Search. |
| genreOverrides complessità UX (PR-2) | Rimandato a P2. La maggior parte degli utenti non ne avrà bisogno. |

---

## Metriche di successo

| Metrica | Target |
|---------|--------|
| % libri consigliati aggiunti alla libreria | > 15% (vs attuale non tracciato) |
| Tempo medio per trovare un libro (ricerca) | < 10 secondi |
| Utenti che tornano all'assistant | > 50% entro 7 giorni |
| Accuratezza percepita raccomandazioni | Feedback positivo (da implementare) |
