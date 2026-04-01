# BookSnap — Backlog / Icebox

**Ultimo aggiornamento:** 2026-04-01

Feature valide e approvate dal Product Owner, ma non attualmente in lavorazione. Ogni voce e' una mini-epic con contesto architetturale.

---

## SC-1/SC-2 — Monitoraggio Scan e Scarto Pre-Salvataggio

**Obiettivo:** Dare all'utente controllo e feedback sulla sessione di scansione.

**Requisiti:**
- **SC-1:** Contatore di sessione post-scan — dopo ogni salvataggio, mostrare riepilogo "X libri aggiunti in questa sessione". Il counter si resetta quando l'utente esce dalla pagina scan.
- **SC-2:** Possibilita' di scartare un libro riconosciuto prima di confermarlo. Icona "X" su ogni card nella lista risultati. Il libro scartato scompare dalla lista ma non viene eliminato dal DB (potrebbe gia' esistere da un'altra scansione).

**Impatto tecnico:**
- File: `app/(app)/scan/page.tsx`
- SC-1: nuovo stato `sessionCount` (number), incrementato ad ogni POST riuscito, mostrato in un badge/toast
- SC-2: nuovo stato `dismissedBooks` (Set di indici o ID temporanei), filtro visivo sulla lista risultati

**Effort:** S per entrambi (modifiche solo UI, nessun cambio backend)

---

## SC-3 — Menu Multi-Scan (FAB "+")

**Obiettivo:** Refactoring del bottone "+" nella libreria. Attualmente apre direttamente la scansione. Deve aprire un Bottom Sheet con piu' opzioni.

**Opzioni nel Bottom Sheet:**
1. **Scansione fotocamera** — comportamento attuale, naviga a `/scan`
2. **Inserimento manuale** — apre il bottom sheet IM-4 (gia' implementato)
3. **Da galleria** — seleziona immagine dalla galleria, invia a `/api/scan` come base64
4. **Da CSV** — placeholder disabilitato con label "Prossimamente" (implementazione in Fase 9, IM-2)

**Impatto tecnico:**
- File: `app/(app)/library/page.tsx` — sostituire il FAB con apertura bottom sheet
- Nuovo componente: `components/AddBookMenu.tsx` + CSS Module
- La voce "Da galleria" richiede un `<input type="file" accept="image/*">` nascosto, conversione a base64, e POST a `/api/scan` (stessa logica della fotocamera ma senza stream video)

**Effort:** M

---

## AI-7 — Libri Simili via AI (On-Demand)

**Obiettivo:** Nella scheda libro (`book/[id]`), sezione "Libri simili" che interroga l'AI con titolo + autore + generi del libro corrente e restituisce 5 suggerimenti affini.

**Differenza da SR-5 (gia' implementato):**
SR-5 cerca prima nel DB locale (overlap generi) e usa l'LLM come fallback. AI-7 e' una chiamata LLM esplicita on-demand, attivata dall'utente con un bottone "Trova libri simili".

**Impatto tecnico:**
- File: `app/(app)/book/[id]/page.tsx` — sezione con bottone + risultati
- Endpoint: `POST /api/books/[id]/similar` (o riuso `/api/assistant` con prompt dedicato)
- Prompt LLM: "Dato questo libro [titolo, autore, generi], suggerisci 5 libri simili. Per ognuno: titolo, autore, perche' e' simile."
- Arricchimento: i risultati LLM passano per `enrichBookMetadata()` per copertine e metadati

**Attenzione — Tracciamento costi:**
- Ogni chiamata = 1 query AI. **DEVE** incrementare `usageStats.aiQueries` sul documento User.
- Considerare un rate limit soft (es. max 5 richieste simili/giorno per utente free in Fase 10).
- Considerare cache: se il libro ha gia' suggerimenti "simili" recenti (< 7 giorni), servirli senza ricalcolare.

**Effort:** M

---

## LN-1/LN-2 — Tracciamento Prestiti e Reminder

**Obiettivo:** Gestione completa del prestito fisico di libri, sia all'interno del gruppo (Community Intima) che verso persone esterne.

### LN-1: Tracciamento Prestiti

**Requisiti:**
- Quando lo status di un BookEntry diventa `lent`, mostrare campo "Prestato a" (nome contatto, testo libero) + data inizio prestito
- Il campo `lentTo` esiste gia' nello schema BookEntry. Aggiungere: `lentAt: Date` (data inizio prestito) e `lentDueDate?: Date` (data restituzione prevista, opzionale)
- UI nella scheda libro: quando status = `lent`, sezione dedicata con nome contatto e date

**Impatto tecnico:**
- File: `models/Library.ts` — aggiungere `lentAt` e `lentDueDate` a BookEntry
- File: `app/api/libraries/[id]/books/route.ts` — PATCH: aggiungere `lentAt`, `lentDueDate` a `allowedFields`
- File: `app/(app)/book/[id]/page.tsx` — sezione prestito condizionale

### LN-2: Reminder Prestiti

**Requisiti:**
- Notifica in-app al login: "Hai ancora [libro] prestato a [nome] da [X giorni]"
- Trigger: al login o al mount della home, controllare se ci sono prestiti con `lentAt` > 30 giorni fa (o > `lentDueDate`)
- Freccia di reminder configurabile dall'utente (es. ogni 30, 60, 90 giorni)
- Funziona anche per prestiti a persone fuori dal gruppo

**Impatto tecnico:**
- Endpoint: `GET /api/libraries/loans/overdue` — restituisce lista prestiti scaduti/lunghi
- UI: banner o toast nella home page al mount, con link alla scheda libro
- Non serve push notification (gia' troppo invasivo), basta un check client-side al login

**Effort:** S (LN-1) + M (LN-2)

---

## TR-1 — Super Trending

**Obiettivo:** Lista unica dei top 20 libri piu' "hot", calcolata da fonti multiple, visibile nella pagina `/search`.

**Score composito (4 fonti):**
| Fonte | Peso | Note |
|-------|------|------|
| NYT Bestsellers API | 40% | Richiede API key (gratuita) |
| Google Books Charts | 30% | Scraping o API, dati meno strutturati |
| OpenLibrary Popular | 20% | Endpoint trending/popular |
| Scansioni BookSnap | 10% | Conteggio libri aggiunti nelle ultime 2 settimane |

**Vincolo Architetturale Critico:**

> **NON fare chiamate on-the-fly.** Le 4 fonti esterne sono lente e inaffidabili. Un endpoint che le chiama in tempo reale andra' in timeout su serverless (Vercel ha limite 10s su free tier).

**Soluzione: Cron Job giornaliero**
1. Script `scripts/update-trending.ts` (o Vercel Cron) eseguito 1x/giorno
2. Lo script chiama tutte e 4 le fonti, calcola lo score composito, normalizza
3. Salva il risultato come documento JSON in una collection MongoDB dedicata (`TrendingCache`) o in un singolo documento
4. L'endpoint `GET /api/trending` legge SOLO la cache e la restituisce — zero chiamate esterne, risposta < 100ms

**Schema TrendingCache:**
```
{
  generatedAt: Date,
  books: [{
    rank: number,
    title: string,
    authors: string[],
    coverUrl: string,
    bookId?: ObjectId,     // se il libro esiste nel nostro DB
    score: number,
    sources: { nyt: boolean, google: boolean, openLibrary: boolean, booksnap: boolean },
    whyTrending: string    // es. "#3 NYT Bestseller + 45 scansioni BookSnap"
  }]
}
```

**UI (TR-2):** Sezione "Super Trending" fissa in `/search`, card con copertina + rank + "Perche' trending". Click → book detail.

**Endpoint (TR-3):** `GET /api/trending` → `{ trending: [...], generatedAt: "..." }`

**Effort:** L (infrastruttura cron + 4 integrazioni API + UI)
