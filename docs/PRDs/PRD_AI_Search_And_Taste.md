# PRD — AI Search e Taste Profile 2.0

**Versione:** 1.0
**Data:** 2026-04-01
**Stato:** Pianificato — copre i task aperti SR-6 e FX-7 (+ FX-8)
**Feature ID:** SR-6, FX-7, FX-8

---

## Obiettivo

Chiudere i tre task rimasti della Fase 7b:

1. **SR-6 — AI Search:** La pagina `/search` deve supportare query in linguaggio naturale. L'LLM interpreta l'intento dell'utente, estrae parametri di filtro strutturati, e la ricerca avviene via query MongoDB — non via embeddings.
2. **FX-7 — Taste Profile Redesign:** Il profilo gusti attuale (donut + barre %) non e' comprensibile. Servono una UI leggibile e un motore che integri i segnali `liked`/`favorite`.
3. **FX-8 — Raccomandazioni potenziate:** Le raccomandazioni proattive devono pesare i segnali di reazione (`liked`, `favorite`) oltre a status e rating.

---

## SR-6: AI Search — Approccio tecnico

### Perche' NON usare embeddings

| Approccio | Pro | Contro |
|-----------|-----|--------|
| **Vector embeddings** (MongoDB Atlas Vector Search) | Semanticamente potente | Richiede Atlas M10+ ($57/mese min), indicizzazione di tutti i libri, costi di embedding per ogni insert, complessita' operativa |
| **LLM come parser di query** (approccio scelto) | Zero infrastruttura aggiuntiva, funziona su free tier MongoDB, costi prevedibili (1 chiamata LLM per query) | Meno potente per query molto vaghe |

### Architettura: LLM → Parametri → Query MongoDB

```
Utente digita: "un thriller ambientato in Scandinavia scritto dopo il 2010"
         |
         v
   [LLM: estrai parametri]
         |
         v
   { genres: ["Thriller"], 
     description_keywords: ["Scandinavia", "nordico"],
     yearFrom: 2010 }
         |
         v
   [Query MongoDB strutturata]
         |
         v
   Risultati ordinati per rilevanza
```

### Implementazione

**Endpoint:** `POST /api/search/ai` (o estensione di `GET /api/books`)

**Step 1 — LLM estrae parametri:**
```typescript
const SEARCH_PARSER_PROMPT = `
Sei un parser di query di ricerca libri. Data la query dell'utente, estrai parametri strutturati.
Rispondi SOLO con JSON valido, senza markdown.

Parametri possibili:
- title: stringa (se l'utente cerca un titolo specifico)
- author: stringa (se l'utente cerca un autore specifico)
- genres: string[] (generi letterari rilevanti)
- keywords: string[] (parole chiave per cercare nella descrizione)
- yearFrom: number (anno minimo pubblicazione)
- yearTo: number (anno massimo pubblicazione)
- language: string (codice lingua: "it", "en", etc.)
- pageRange: "short" (<200) | "medium" (200-400) | "long" (>400)
- mood: string (atmosfera: "dark", "leggero", "avventuroso", etc.)
- intent: "specific" | "discovery" | "similar"

Esempi:
Query: "un giallo nordico recente"
→ { "genres": ["Giallo", "Thriller"], "keywords": ["nordico", "scandinavo"], "yearFrom": 2020, "intent": "discovery" }

Query: "libri come Il nome della rosa"
→ { "title": "Il nome della rosa", "genres": ["Storico", "Giallo"], "intent": "similar" }

Query: "romanzi brevi di Calvino"
→ { "author": "Italo Calvino", "pageRange": "short", "intent": "specific" }
`

const parsed = await callLLM(
  SEARCH_PARSER_PROMPT + `\n\nQuery utente: "${userQuery}"`
)
```

**Step 2 — Costruisci query MongoDB:**
```typescript
function buildMongoQuery(params: ParsedSearchParams) {
  const query: any = {}
  const sort: any = {}

  if (params.title) {
    query.title = { $regex: params.title, $options: 'i' }
  }
  if (params.author) {
    query.authors = { $regex: params.author, $options: 'i' }
  }
  if (params.genres?.length) {
    query.genres = { $in: params.genres.map(g => new RegExp(g, 'i')) }
  }
  if (params.keywords?.length) {
    // Cerca keywords nella descrizione
    query.description = {
      $regex: params.keywords.join('|'),
      $options: 'i'
    }
  }
  if (params.yearFrom || params.yearTo) {
    query.publishedYear = {}
    if (params.yearFrom) query.publishedYear.$gte = params.yearFrom
    if (params.yearTo) query.publishedYear.$lte = params.yearTo
  }
  if (params.language) {
    query.language = params.language
  }
  if (params.pageRange) {
    const ranges = { short: { $lt: 200 }, medium: { $gte: 200, $lte: 400 }, long: { $gt: 400 } }
    query.pageCount = ranges[params.pageRange]
  }

  return { query, sort }
}
```

**Step 3 — Risultati ibridi:**

Se la query MongoDB restituisce < 5 risultati e `intent === 'discovery'`, fare una seconda chiamata LLM: "Suggerisci 5 libri che matchano [query originale]" e arricchirli con `enrichBookMetadata()`.

Questo crea un sistema a due livelli:
1. **DB locale** (libri gia' nel sistema) — veloce, gratuito
2. **LLM fallback** (suggerimenti nuovi) — piu' lento, costa 1 query AI

**Tracciamento costi:** Ogni chiamata a `/api/search/ai` **DEVE** incrementare `usageStats.aiQueries`.

### UI nella pagina `/search`

- La search bar esistente accetta sia query strutturate (titolo/autore) che naturali ("un fantasy leggero per l'estate")
- Rilevamento automatico: se la query contiene solo 1-3 parole, usa ricerca testo classica. Se contiene frasi descrittive, usa AI Search.
- Indicatore visivo "Ricerca AI" quando il parsing LLM e' attivo (shimmer/loading)
- I risultati mostrano un badge "AI" se provengono dal fallback LLM

---

## FX-7: Taste Profile — Redesign UI

### Problema attuale

La pagina profilo gusti mostra:
- Grafico donut con distribuzione generi → non comprensibile per utenti non tecnici
- Barre percentuali di affinita' → i numeri non significano nulla per l'utente

### Nuova UI — "Il tuo DNA da lettore"

**Layout proposto:**

```
┌─────────────────────────────────┐
│  Il tuo DNA da lettore          │
├─────────────────────────────────┤
│                                 │
│  I TUOI GENERI                  │
│  ████████████ Fantasy      85%  │
│  █████████   Sci-Fi        62%  │
│  ██████     Storico        45%  │
│  ██         Thriller       15%  │
│                                 │
│  I TUOI AUTORI PREFERITI        │
│  ⭐ Brandon Sanderson (3 libri) │
│  ⭐ U. K. Le Guin (2 libri)    │
│                                 │
│  IN SINTESI                     │
│  "Ami il fantasy epico con      │
│   worldbuilding complesso.      │
│   Leggi circa 2 libri al mese  │
│   e preferisci libri 300-500   │
│   pagine."                      │
│                                 │
│  ❤️ Piaciuti: 12 libri          │
│  ⭐ Preferiti: 5 libri          │
└─────────────────────────────────┘
```

**Elementi chiave:**
1. **Barre colorate per genere** — semplici, senza numeri decimali. Solo nome genere + barra + percentuale arrotondata
2. **Top 3-5 autori** — con conteggio libri, no rating numerico (basta la stella)
3. **Sintesi in linguaggio naturale** — generata dall'LLM una volta e cachata (come `Book.aiSummary`). Testo in prima persona.
4. **Contatori reazione** — quanti libri `liked` e `favorite` ha l'utente (segnale di engagement)

**Dove cachare la sintesi:**
```typescript
// In User model, dentro aiCache (gia' esistente)
aiCache: {
  insights: { data: any[], expiresAt: Date },
  goals: { data: any[], expiresAt: Date },
  tasteSummary: { text: string, expiresAt: Date }  // NUOVO
}
```

**Implementazione:**
- File: `app/(app)/profile/page.tsx` — sezione taste profile riscritta
- File: `app/(app)/profile/page.module.css` — stili nuovi
- Endpoint: `GET /api/profile/taste` — aggiungere campo `summary` (testo LLM cachato)

---

## FX-8: Raccomandazioni potenziate con segnali liked/favorite

### Modifiche all'algoritmo in `lib/tasteProfile.ts`

Aggiungere i segnali `liked` e `favorite` come moltiplicatori nel calcolo del taste profile:

```typescript
// Moltiplicatori ATTUALI per status:
// completed + rating 5 → x3.0
// completed + rating 4 → x2.5
// reading → x2.0
// to_read → x1.0
// abandoned → x0.3

// NUOVI moltiplicatori per reazione:
// liked === true → x1.5 aggiuntivo (segnale "mi e' piaciuto")
// favorite === true → x2.0 aggiuntivo (segnale forte "lo adoro")
// liked + favorite → x2.5 aggiuntivo (massimo segnale)

// Esempio: un libro completed (x1.5) + liked (x1.5) + in genere Fantasy
// → score Fantasy += 1 * 1.5 * 1.5 = 2.25
// vs un libro completed (x1.5) senza reazione
// → score Fantasy += 1 * 1.5 = 1.5
```

### Modifiche al prompt raccomandazioni

In `app/api/recommendations/route.ts` e `app/api/assistant/route.ts`, aggiungere al blocco PROFILO LETTORE:

```
SEGNALI DI GRADIMENTO:
- Libri "piaciuti" (cuore): [lista titoli liked]
- Libri "preferiti" (stella): [lista titoli favorite]
- Pattern preferiti: [generi/autori dei libri favoriti]

Dai MASSIMA priorita' ai pattern dei libri con stella (preferiti).
I libri con cuore (piaciuti) sono un segnale secondario ma significativo.
```

### Impatto tecnico

| File | Modifica |
|------|----------|
| `lib/tasteProfile.ts` | Aggiungere moltiplicatori liked/favorite nel calcolo scoring |
| `app/api/recommendations/route.ts` | Includere lista liked/favorite nel prompt LLM |
| `app/api/assistant/route.ts` | Stesso arricchimento prompt |
| `app/api/profile/taste/route.ts` | Includere contatori liked/favorite nella risposta |

---

## Step implementativi

### Step 1 — FX-8: Taste Profile Engine upgrade

1. Modificare `lib/tasteProfile.ts`: aggiungere moltiplicatori liked/favorite
2. Aggiungere al TasteProfile output: `likedCount`, `favoriteCount`, `likedGenres`, `favoriteGenres`
3. Aggiornare prompt in `assistant/route.ts` e `recommendations/route.ts`

**Verifica:** Marcare alcuni libri come liked/favorite. Chiamare `/api/profile/taste`. Verificare che i generi dei libri favoriti abbiano score piu' alto. Chiedere raccomandazioni all'assistant e verificare che riflettano i preferiti.

### Step 2 — FX-7: Taste Profile UI redesign

1. Riscrivere sezione taste profile in `profile/page.tsx`
2. Layout: barre generi + autori + sintesi NL + contatori reazione
3. Aggiungere generazione/cache sintesi in linguaggio naturale

**Verifica:** Aprire profilo. Le barre riflettono i generi reali. La sintesi e' leggibile e accurata. I contatori liked/favorite sono corretti.

### Step 3 — SR-6: AI Search

1. Creare `app/api/search/ai/route.ts` con prompt parser + query builder
2. Aggiornare `app/(app)/search/page.tsx` per rilevare query naturali e usare il nuovo endpoint
3. Gestire fallback LLM per query con pochi risultati DB
4. Aggiungere incremento `usageStats.aiQueries`

**Verifica:** Cercare "un giallo nordico recente" → risultati pertinenti. Cercare "Tolkien" → ricerca classica (no AI). Verificare che il contatore usage si incrementa.

---

## Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| LLM parser restituisce JSON malformato | Wrap in try/catch. Se parsing fallisce, fallback a ricerca testo classica |
| Costi API per AI Search su ogni query | Rilevamento automatico: solo query descrittive passano per LLM. Query brevi (1-3 parole) usano ricerca classica |
| Sintesi taste profile troppo generica | Includere dati concreti nel prompt (titoli specifici, non solo generi). Cache 24h per non rigenerare |
| Moltiplicatori liked/favorite sbilanciati | Testare con librerie reali. I moltiplicatori sono aggiuntivi (non sostitutivi) — il volume di libri completati resta il segnale dominante |
