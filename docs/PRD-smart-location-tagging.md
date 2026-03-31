# PRD — Smart Location Tagging (Zero-Setup)

**Versione:** 1.0
**Data:** 2026-03-31
**Stato:** In implementazione — Fase 4 completata
**Feature ID:** LT-1

---

## Obiettivo

Permettere all'utente di annotare **dove si trova fisicamente** ogni libro (es. "Soggiorno", "Scatola Cantina", "Scaffale camera") con un approccio zero-setup: nessuna alberatura rigida, solo testo libero con autocompletamento intelligente sui luoghi già usati.

---

## Motivazione

Chi possiede decine o centinaia di libri fisici perde tempo a cercarli. Aggiungere un campo di posizione leggero (senza la complessità di gerarchie Libreria > Scaffale > Ripiano) rende il catalogo utile anche per ritrovare fisicamente i libri.

---

## Requisiti funzionali

| ID | Requisito | Priorità |
|----|-----------|----------|
| LT-1.1 | Campo `location` (stringa libera) sul BookEntry | P0 |
| LT-1.2 | Flag `behindRow` (boolean) per indicare "fila posteriore" | P0 |
| LT-1.3 | Autocompletamento sui luoghi già usati dall'utente (client-side, offline-ready) | P0 |
| LT-1.4 | Step "Dove si trovano?" nel flusso post-scan, con bulk assignment | P0 |
| LT-1.5 | Modifica location dalla scheda libro (book detail) | P0 |
| LT-1.6 | Filtro/raggruppamento per location nella libreria | P1 |
| LT-1.7 | Visualizzazione location sulla card libro in libreria | P1 |

---

## Analisi impatto sulla codebase attuale

### 1. Database — `models/Library.ts`

**BookEntry subdocument** — aggiungere 2 campi:

```typescript
// Nuovi campi in BookEntry interface
location?: string      // es. "Soggiorno", "Scaffale camera"
behindRow?: boolean    // true = libro nascosto dietro un'altra fila
```

```typescript
// Nuovi campi in BookEntrySchema
location: { type: String, trim: true, maxlength: 100 },
behindRow: { type: Boolean, default: false },
```

**Impatto:** Minimale. I campi sono opzionali, nessuna migrazione necessaria — i documenti esistenti avranno semplicemente `undefined` per entrambi.

**Nessuna modifica a `models/Book.ts`** — la location è una proprietà della *copia dell'utente* (BookEntry), non del libro in sé. Lo stesso libro può essere in "Soggiorno" per un utente e in "Cantina" per un altro.

### 2. API — `app/api/libraries/[id]/books/route.ts`

**POST** (aggiunta libro): accettare `location` e `behindRow` nel body, passarli al nuovo BookEntry.

**PATCH** (aggiornamento): aggiungere `'location'` e `'behindRow'` all'array `allowedFields` (attualmente riga ~83).

### 3. API — Nuovo endpoint per locations usate

**GET `/api/libraries/locations`** — restituisce la lista distinta di tutte le `location` usate dall'utente (aggregando su tutte le sue librerie). Servito una volta al mount del componente per alimentare l'autocompletamento.

**Case-insensitive dedup:** La query MongoDB usa aggregation pipeline con `$toLower` per raggruppare le varianti (es. "Soggiorno" e "soggiorno" diventano una sola voce). Viene restituita la forma originale più recente (l'ultima scritta dall'utente).

```typescript
// Aggregation pipeline
Library.aggregate([
  { $match: { userId } },
  { $unwind: '$books' },
  { $match: { 'books.location': { $exists: true, $ne: '' } } },
  { $sort: { 'books.addedAt': -1 } },
  { $group: {
      _id: { $toLower: '$books.location' },
      location: { $first: '$books.location' }  // forma originale più recente
  }},
  { $sort: { _id: 1 } }
])

// Response
{ locations: ["Scaffale camera", "Scatola cantina", "Soggiorno"] }
```

### 4. Strategia autocompletamento (offline/veloce)

L'autocompletamento **NON** deve fare una chiamata API ad ogni keystroke. La strategia:

1. **Fetch once**: al mount del componente location, chiamare `GET /api/libraries/locations` → ricevere array di stringhe.
2. **Stato locale**: salvare in `useState<string[]>` (o passare come prop).
3. **Filtro client-side**: `locations.filter(l => l.toLowerCase().startsWith(input.toLowerCase()))`.
4. **Aggiornamento locale**: quando l'utente salva una nuova location, aggiungerla all'array locale senza ri-fetchare.

Questo approccio è veloce (filtro in-memory), offline-ready dopo il primo fetch, e non genera traffico di rete durante la digitazione. Per un utente tipico (5-20 location diverse) la lista è trascurabile in memoria.

### 5. UI — Componente `LocationInput`

Nuovo componente riutilizzabile:

```
components/LocationInput.tsx
components/LocationInput.module.css
```

**Caratteristiche:**
- Input testuale con dropdown di suggerimenti (filtro `startsWith`)
- Icona 📍 a sinistra
- Toggle/checkbox "Fila posteriore" sotto il campo
- Utilizzabile sia nel flusso post-scan che nella scheda libro

### 6. UI — Flusso post-scan (bulk location assignment)

**Punto di inserimento:** dopo che l'utente vede i risultati della scansione (lista libri riconosciuti), e **prima** del salvataggio nella libreria.

**Comportamento:**
1. L'utente scansiona → vede la lista dei libri riconosciuti (stato attuale)
2. Nuovo step: **bottom sheet / modal** "Dove si trovano questi libri?"
   - Tutti i libri scansionati sono preselezionati (checkbox)
   - Un campo `LocationInput` unico per la posizione condivisa
   - Toggle "Fila posteriore"
   - L'utente può deselezionare singoli libri se hanno posizioni diverse
   - Pulsante "Salva" → aggiunge i libri **selezionati** alla libreria con la location indicata
   - Link "Salta" → aggiunge **tutti** senza location (comportamento attuale)
3. Ogni libro selezionato viene POST-ato con `{ bookId, status: 'to_read', location, behindRow }`

**Flusso multi-posizione (libri deselezionati):**
- Dopo "Salva", i libri selezionati vengono salvati e **rimossi dalla lista visibile**
- I libri **deselezionati restano a schermo** nel medesimo step location
- L'utente può assegnare loro una posizione diversa e premere "Salva" di nuovo
- Il ciclo si ripete finché non restano più libri, oppure l'utente preme "Salta" per salvare i rimanenti senza location
- Questo permette di assegnare N posizioni diverse in N passaggi senza uscire dal flusso

### 7. UI — Scheda libro (book detail)

Aggiungere sezione "Posizione" nella scheda libro (`app/(app)/book/[id]/page.tsx`):
- Mostrare sotto lo status selector
- Campo `LocationInput` + toggle "Fila posteriore"
- Salvataggio via PATCH (stesso pattern di rating/review)

### 8. UI — Library page

- Mostrare la location come badge/etichetta sotto il titolo nelle card libro
- Se `behindRow` è true, mostrare indicatore visivo (es. icona o label "↩ Fila post.")
- Futuro (LT-1.6): filtro per location nel pannello filtri esistente

---

## Flusso dati completo

```
[Scan] → LLM riconosce libri → UI mostra risultati
   ↓
[Location Step] → utente digita location + behindRow
   ↓  (fetch locations per autocomplete al mount)
[POST /api/libraries/{id}/books] → { bookId, status, location, behindRow }
   ↓
[MongoDB] → BookEntry salvato con location
   ↓
[Library page] → mostra location su card
[Book detail] → mostra/edita location via PATCH
```

---

## File coinvolti (mappa impatto)

| File | Modifica | Effort |
|------|----------|--------|
| `models/Library.ts` | +2 campi a BookEntry (interface + schema) | XS |
| `app/api/libraries/[id]/books/route.ts` | POST: accettare location/behindRow; PATCH: aggiungere a allowedFields | S |
| `app/api/libraries/locations/route.ts` | **Nuovo** — GET distinct locations per utente | S |
| `components/LocationInput.tsx` | **Nuovo** — input con autocomplete + toggle behindRow | M |
| `components/LocationInput.module.css` | **Nuovo** — stili componente | S |
| `app/(app)/scan/page.tsx` | Aggiungere step location pre-salvataggio, bulk flow | M |
| `app/(app)/scan/page.module.css` | Stili per il location step | S |
| `app/(app)/book/[id]/page.tsx` | Sezione posizione con LocationInput | S |
| `app/(app)/book/[id]/page.module.css` | Stili sezione posizione | XS |
| `app/(app)/library/page.tsx` | Badge location su card libro | S |
| `app/(app)/library/page.module.css` | Stili badge | XS |

---

## Piano a fasi (step-by-step)

### Fase 1 — Schema DB + API (backend puro, testabile subito) ✅

**Obiettivo:** I campi esistono nel DB e l'API li accetta/restituisce.

1. ✅ Aggiornare `models/Library.ts`: aggiungere `location` e `behindRow` a interface e schema
2. ✅ Aggiornare `app/api/libraries/[id]/books/route.ts`:
   - POST: leggere `location` e `behindRow` dal body, includerli nel nuovo BookEntry
   - PATCH: aggiungere `'location'` e `'behindRow'` a `allowedFields`
3. ✅ Creare `app/api/libraries/locations/route.ts`: GET che aggrega le location distinte dell'utente

**Verifica:** Testabile via curl/Postman — POST un libro con location, PATCH per modificarla, GET locations per confermare che appare nella lista.

---

### Fase 2 — Componente LocationInput (UI riutilizzabile, isolato) ✅

**Obiettivo:** Componente autocompletamento funzionante, utilizzabile ovunque.

1. ✅ Creare `components/LocationInput.tsx`:
   - Props: `value`, `onChange`, `behindRow`, `onBehindRowChange`, `locations` (array suggerimenti)
   - Input con dropdown suggerimenti filtrati client-side
   - Toggle "Fila posteriore" integrato
2. ✅ Creare `components/LocationInput.module.css` con stili coerenti con il design system (CSS vars da globals.css)

**Verifica:** Componente visibile e funzionante in isolamento (può essere testato montandolo temporaneamente in qualsiasi pagina).

---

### Fase 3 — Integrazione Book Detail (singolo libro) ✅

**Obiettivo:** L'utente può assegnare/modificare la posizione di un libro dalla sua scheda.

1. ✅ In `app/(app)/book/[id]/page.tsx`:
   - Fetch locations al mount (`GET /api/libraries/locations`)
   - Aggiungere sezione "Posizione" con `LocationInput`
   - Salvataggio via PATCH (pattern identico a rating/review)
   - Aggiornamento ottimistico dello stato locale
2. ✅ Stili in `page.module.css`

**Verifica:** Aprire un libro → impostare location → ricaricare pagina → la location persiste. Autocompletamento funziona con location già esistenti.

---

### Fase 4 — Integrazione Scan (bulk assignment) ✅

**Obiettivo:** Dopo una scansione, l'utente assegna la posizione a tutti i libri riconosciuti prima di salvarli.

1. ✅ In `app/(app)/scan/page.tsx`:
   - Nuovo stato: `locationStep` (boolean), `bulkLocation`, `bulkBehindRow`, `selectedForLocation` (Set di bookId)
   - Dopo scan, bottone "Aggiungi alla libreria" apre bottom sheet con:
     - Lista libri con checkbox (tutti preselezionati)
     - `LocationInput` per posizione condivisa
     - Toggle "Fila posteriore"
     - Pulsanti "Salta" e "Salva (N)"
   - "Salva" → POST libri selezionati con location/behindRow; ciclo multi-posizione per i deselezionati
   - "Salta" → POST tutti i rimanenti senza location
   - Fetch locations al mount (in parallelo con fetch library)
2. ✅ Stili in `page.module.css`

**Verifica:** Scansionare libri → step location appare → selezionare posizione → tutti i libri salvati con quella location. Verificare anche "Salta" che mantiene il flusso attuale.

---

### Fase 5 — Visualizzazione in Library + Filtro

**Obiettivo:** Le location sono visibili nella libreria e filtrabili.

1. In `app/(app)/library/page.tsx`:
   - Mostrare badge location sulle card dei libri (sia grid che list view)
   - Indicatore visivo per `behindRow`
   - Aggiungere filtro per location nel pannello filtri esistente
2. Stili in `page.module.css`

**Verifica:** I libri con location mostrano il badge. Filtrando per "Soggiorno" appaiono solo i libri in quella posizione.

---

## Decisioni di design aperte

| # | Domanda | Opzioni | Raccomandazione |
|---|---------|---------|-----------------|
| 1 | Step location post-scan: modal/bottom-sheet o inline nelle card? | A) Bottom sheet separato B) Inline su ogni card con "Applica a tutti" | **A** — ✅ confermato |
| 2 | Normalizzazione location (case)? | A) Case-insensitive match ma salva come digitato B) Tutto lowercase | **A** — ✅ confermato, dedup via `$toLower` in aggregation |
| 3 | Limite location per utente? | A) Illimitato B) Max 50 | **A** — non serve limitare stringhe corte |
| 4 | Inserimento manuale libro (`IM-4`): includere location? | A) Sì, nel form B) No, solo via edit successivo | **A** — ✅ confermato dall'utente |

---

## Non in scope (v1)

- Gerarchia location (Libreria > Scaffale > Ripiano) — contrario al principio zero-setup
- Location condivisa tra utenti del gruppo — da valutare nella feature Community Intima
- Mappa visiva delle location — nice-to-have futuro
- Ricerca per location nell'assistant AI — futuro
