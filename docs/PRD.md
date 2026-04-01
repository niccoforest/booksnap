# BookSnap PRD — Roadmap Attiva

**Versione:** 3.0
**Data:** 2026-04-01
**Stato:** Attivo — Fase 7b (residui) in corso, Fasi 7–10 pianificate

---

## Obiettivi di prodotto

BookSnap e' una piattaforma intelligente per la gestione di librerie personali. La vision attuale si fonda su tre pilastri:

1. **Intelligenza personale** — Il Taste Profile Engine conosce i gusti dell'utente e guida tutte le raccomandazioni AI. I segnali `liked`/`favorite` alimentano lo scoring.
2. **Community Intima** — Gruppi chiusi (famiglia, amici) con librerie condivise e prestito fisico. Non una community pubblica/globale.
3. **Monetizzazione sostenibile** — Tracciamento silente dell'usage (`usageStats.aiQueries`, `usageStats.scans`) per futura gating freemium (Fase 10).

**Per la storia completa delle fasi 1–6 completate, vedi:** `docs/ARCHIVE_PHASES_1_to_6.md`

---

## Dichiarazione Pivot Community

> La vision e' passata da "Community Globale/Pubblica" a "Community Intima/Famigliare" (Gruppi chiusi).

La Fase 6 ha implementato una community pubblica globale (activity feed, trending, follow system, challenges, bookshelves pubbliche). Questa direzione e' stata abbandonata.

**Stato del codice Fase 6:**
- Feed globale, trending, challenges → **nascosti dall'UI** (codice preservato, non eliminato)
- Follow system → **preservato**, base per il futuro sistema gruppi
- Bookshelves pubbliche → **preservate**, utili per condivisione nel gruppo
- Tab Community nel BottomNav → **sostituita con Search** (FX-1, completato)

**Il vecchio codice pubblico andra' deprecato o migrato** quando la Community Intima sara' implementata. Vedi PRD dedicato: `docs/PRDs/PRD_Community_Intima.md`.

---

## Feature Map — Solo task attivi e futuri

### Fase 7b — Fix & Revisioni residue ← IN CORSO

| ID | Feature | Priorita' | Effort | Stato |
|----|---------|-----------|--------|-------|
| FX-7 | Profilo Gusti — redesign UI per renderlo comprensibile | P1 | M | Backlog |
| FX-8 | Raccomandazioni — potenziare con segnali liked/favorite | P1 | M | Backlog |
| SR-6 | Pagina Ricerca — AI Search (LLM interpreta query, migliora risultati) | P1 | M | Backlog |

> FX-7 e SR-6 sono coperti dal PRD dedicato: `docs/PRDs/PRD_AI_Search_And_Taste.md`

---

### Fase 7 — Statistics Redesign

| ID | Feature | Priorita' | Effort |
|----|---------|-----------|--------|
| ST-4 | Pagina stats dedicata con SVG charts custom | P1 | L |
| ST-5 | Reading heatmap stile GitHub | P1 | M |
| ST-6 | Genre radar chart SVG | P1 | M |
| ST-7 | Reading pace line chart | P1 | M |
| ST-8 | Annual reading goals con progress ring | P1 | S |
| ST-9 | Year in Review — "Il tuo 2026 in libri" | P2 | L |
| ST-10 | Confronto periodi con delta indicators | P2 | S |

---

### Fase 8 — Library Management Enhancement

| ID | Feature | Priorita' | Effort |
|----|---------|-----------|--------|
| LM-1 | Custom libraries UI — emoji picker, redesign tabs | P1 | S |
| LM-2 | Library sharing via link pubblico | P2 | S |
| LM-3 | Bulk operations — multi-select, status change, move | P1 | M |
| LM-4 | Drag-and-drop reordering | P2 | M |
| LM-5 | Library templates predefiniti | P2 | S |

---

### Fase 9 — Book Import

| ID | Feature | Priorita' | Effort |
|----|---------|-----------|--------|
| IM-1 | ISBN barcode scanning con BarcodeDetector API | P1 | M |
| IM-2 | CSV/Goodreads import con mapping statuses | P1 | M |
| IM-3 | EPUB metadata extraction (client-side JSZip) | P2 | M |
| IM-5 | Bulk text list import ("Titolo - Autore" per riga) | P2 | S |
| IM-6 | Amazon wishlist import (experimental) | P3 | L |

> IM-4 (inserimento manuale) e' gia' completato in Fase 7b.

---

### Fase 10 — Monetizzazione

| ID | Feature | Priorita' | Effort |
|----|---------|-----------|--------|
| MO-1 | Freemium model + Stripe Checkout | P1 | L |
| MO-2 | Affiliate links Amazon con tag | P1 | S |
| MO-3 | Usage gating basato su `usageStats` (aiQueries, scans) | P1 | M |

**Prerequisito:** Silent Usage Tracking deve essere attivo su tutti gli endpoint AI e scan prima di questa fase.

---

## Punti aperti

| # | Argomento | Domanda | Priorita' |
|---|-----------|---------|-----------|
| A | Profilo Gusti | UI comprensibile: lista semplice o grafici? (FX-7) | Alta |
| B | Community Gruppo | Meccanismo di invito (link/codice/username?) | Alta |
| C | Community Gruppo | Privacy librerie condivise: tutto o scaffali selezionati? | Alta |
| D | Raccomandazioni | Peso liked/favorite vs completati nell'algoritmo? (FX-8) | Media |
| E | Notifiche Smart | Casi d'uso concreti prima di ri-esporre la feature | Media |

---

## Backlog / Icebox

Feature valide ma non in lavorazione attiva. Vedi: `docs/BACKLOG_ICEBOX.md`
