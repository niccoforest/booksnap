# BookSnap — Archivio Fasi Completate (1–6)

**Stato:** Archivio storico. Queste fasi sono tutte completate e il codice è in produzione.
**Data archiviazione:** 2026-04-01

---

## Fase 1 — Fondamenta intelligenti (P0) ✅

> AU-1, AU-2, AU-3, AU-4, TP-1, TP-2, RC-1

### AU-1: Google OAuth — API backend
Flusso OAuth 2.0 manuale con Google (no NextAuth). Endpoint `/api/auth/google` genera URL OAuth, `/api/auth/google/callback` scambia il code per token, decodifica `id_token`, e gestisce match/creazione utente.

### AU-2: Google OAuth — UI
Bottone "Accedi con Google" nelle pagine login e register, con divider "oppure" e gestione errori (`?error=google_failed`).

### AU-3: Google OAuth — Account linking
Match automatico per `googleId` o `email`. Se l'utente ha un account email/password con la stessa email di Google, gli account vengono collegati (`authProvider: 'both'`). Utenti solo-Google non hanno `passwordHash`.

### AU-4: Google OAuth — Avatar e info profilo
Foto profilo Google salvata come `avatar`. Flag `avatarCustomized` per non sovrascrivere avatar modificati manualmente.

### TP-1: Taste Profile Engine
`lib/tasteProfile.ts` — Modulo che analizza la libreria utente e genera profilo gusti pesato (genreAffinities, favoriteAuthors, recentlyCompleted, stats). Algoritmo di scoring con moltiplicatori per status, rating e recency.

### TP-2: Taste Profile API
`GET /api/profile/taste` — Espone il taste profile calcolato per l'utente autenticato.

### RC-1: Prompt Assistant potenziato
Il prompt del Bibliotecario AI include il taste profile completo dell'utente per raccomandazioni personalizzate.

---

## Fase 2 — Esperienza utente arricchita (P1) ✅

> RC-2, RC-3, SR-1, SR-2, ST-1, PR-1, UI-1, UI-2, UI-3, UI-4, UI-6

### RC-2: Raccomandazioni proattive (Home)
`GET /api/recommendations` — 5 libri suggeriti basati sul taste profile. Cache 24h. Fallback per librerie vuote.

### RC-3: "Perché questo libro"
Ogni raccomandazione include `matchReason` — spiegazione personalizzata del match.

### SR-1: Ricerca con filtri
Filtri combinabili: genere, anno, lingua, pagine, rating. Query MongoDB composita.

### SR-2: Ricerca nella propria libreria
Search bar + filtri nella pagina libreria. Toggle ricerca locale/globale.

### ST-1: Dashboard statistiche lettura
Metriche aggregate: completati, pagine lette, rating medio, genere/autore più letto.

### PR-1: Pagina profilo gusti
Visualizzazione taste profile nel profilo: generi (barre), autori (top 5), letture recenti, sintesi.

### UI-1/UI-2: Raccomandazioni proattive — card e filtro duplicati
Card book-card style con scroll orizzontale. Filtro server-side dei libri già in libreria.

### UI-3: Book detail — Aggiunta alla libreria con scelta stato
Sezione "Aggiungi alla libreria" con selezione status.

### UI-4: Book detail — Hero con copertina sfocata
Copertina sfocata full-bleed come sfondo, copertina originale galleggiante.

### UI-6: BottomNav — Search e Assistant
`/search` per ricerca filtri, `/assistant` per chat AI.

---

## Fase 3 — Polish e discovery avanzata (P2) ✅

> SR-3, SR-4, SR-5, ST-2, ST-3, PR-2, UI-5

### SR-3: Fuzzy matching
Tolleranza errori di battitura via Levenshtein distance lato applicazione.

### SR-4: Autocomplete ricerca
`GET /api/books/autocomplete?q=&limit=5` — regex prefix match, debounce 300ms.

### SR-5: Libri simili
Nella pagina libro, sezione con 3-5 suggerimenti. Algoritmo: overlap generi DB + fallback LLM.

### ST-2/ST-3: Distribuzione generi e reading pace
Grafico distribuzione generi. Calcolo pace medio (finishedAt - startedAt).

### PR-2: Override manuale generi
Toggle per boost/suppress generi nel profilo. Salvato in `User.preferences.genreOverrides`.

### UI-5: Scan page — revisione layout
Revisione UX della pagina scansione.

---

## Fase 4 — UI/UX Overhaul ✅

> UX-1 → UX-8

- **UX-1:** Typography upgrade — Cormorant Garamond per headings, Inter per body
- **UX-2:** Dark mode completion — tutti i CSS aggiornati con variabili `[data-theme="dark"]`
- **UX-3:** Empty states e onboarding 3-step per nuovi utenti
- **UX-4:** Micro-interactions — entry animations staggerate, transitions fluide
- **UX-5:** Book cards redesign — rating inline, progress bar, vista lista
- **UX-6:** Pull-to-refresh e infinite scroll
- **UX-7:** Swipe gestures — quick-status, tab navigation
- **UX-8:** Sorting options — ordinamento in libreria e ricerca

---

## Fase 5 — AI-Powered Features ✅

> AI-1 → AI-6

- **AI-1:** Reading insights personalizzati dal taste profile (nascosti dall'UI in Fase 7b, da riprendere)
- **AI-2:** Book summaries spoiler-free on-demand (cached in `Book.aiSummary`, condivise tra utenti)
- **AI-3:** Goal suggestions AI-powered (nascosti dall'UI in Fase 7b, da riprendere in Fase 7)
- **AI-4:** Smart push notifications via Service Worker (`public/sw.js`) per utenti inattivi
- **AI-5:** Natural language library search
- **AI-6:** Discussion prompts per book club (nascosti dall'UI in Fase 7b)

---

## Fase 6 — Social & Community ✅ (da rivedere — pivot a Community Intima)

> SO-1 → SO-7

**Nota:** La Fase 6 ha implementato una community pubblica/globale. La vision è stata ridefinita verso una "Community Intima/Famigliare" (gruppi chiusi). Le feature globali sono state nascoste dall'UI (FX-1..FX-4b) ma il codice è preservato per futura migrazione/deprecazione.

- **SO-1:** User profile extension — `isPublic`, `followers`, `following`, `profileSlug`
- **SO-2:** Public profile page `/user/[slug]`
- **SO-3:** Follow system — follow/unfollow, liste follower/following
- **SO-4:** Activity feed — azioni degli utenti seguiti
- **SO-5:** Community bookshelves — liste curate pubbliche
- **SO-6:** Trending books — libri più aggiunti/letti (globale, da sostituire con Super Trending)
- **SO-7:** Reading challenges — personali e community

---

## Fase 7b — Fix & Revisioni (parzialmente completata)

> Completati: FX-1 → FX-6, FX-9, FX-10, FX-11, FX-12, FX-13, FX-14, FX-15, FX-16, BK-1, IM-4

### Fix completati
| ID | Descrizione |
|----|-------------|
| FX-1 | Navigazione — `/search` al posto di `/community` nel BottomNav |
| FX-2 | Domande Book Club nascoste dall'UI (API intatta) |
| FX-3 | Reading Insights nascosti dal profilo |
| FX-4 | Notifiche Smart nascoste dal profilo |
| FX-4b | Obiettivi di Lettura nascosti dal profilo |
| FX-5 | Fix ricerca libreria — campo larghezza + icona rinominata |
| FX-6 | Cache summaries spoiler-free su `Book.aiSummary` |
| FX-9 | Cuore + stella sopra status in book detail |
| FX-10 | Multi-filtri combinabili in libreria (status + reaction indipendenti) |
| FX-11 | Rimosso pulsante "Cerca con AI" dalla libreria |
| FX-12 | Like (cuoricino) sulla book card (griglia e lista) |
| FX-13 | Header libreria ristrutturato |
| FX-14 | Rimosso refresh button raccomandazioni |
| FX-15 | Alert errore scan condizionale + chiudibile |
| FX-16 | BottomNav nascosta con `camera-active` durante scan |

### Feature completate
| ID | Descrizione |
|----|-------------|
| BK-1 | Preferiti/Piaciuti — `liked` (heart) e `favorite` (star) su BookEntry |
| IM-4 | Inserimento manuale libro — bottom sheet con form |

---

## Smart Location Tagging (LT-1 → LT-7) ✅

Feature cross-fase completata. Dettagli nel PRD dedicato: `docs/PRD-smart-location-tagging.md`.

- Campo `location` (stringa libera) e `behindRow` (boolean) su BookEntry
- Autocompletamento client-side su location già usate
- Step "Dove si trovano?" nel flusso post-scan con bulk assignment
- Modifica location dalla scheda libro
- Filtro e badge location nella libreria
- Endpoint: `GET /api/libraries/locations`

---

## Changelog storico

### v2.3 — 2026-03-31
- FX-10, FX-12, IM-4 completati
- SC-1/2, SC-3, AI-7, LN-1/2, TR-1/2/3 aggiunti al backlog

### v2.2 — 2026-03-31
- FX-9, FX-11, FX-13, FX-14, FX-15, FX-16 completati

### v2.1 — 2026-03-31
- FX-1 → FX-6, BK-1 completati. Community ridefinita.

### v2.0 — 2026-03-30
- AI-1 → AI-6 completati. Dashboard AI, summaries, notifications push, NL search.

### v1.1 — 2026-03-30
- UI-1 → UI-4, UI-6 completati.
