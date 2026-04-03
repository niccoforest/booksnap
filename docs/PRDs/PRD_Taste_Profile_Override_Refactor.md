# PRD — Taste Profile Override Refactor
**Progetto:** BookSnap  
**Feature:** Refactor sistema boost/downgrade generi  
**Stato:** Completato  
**Data:** 2026-04-03  

***

## Sommario

Il sistema attuale di override sui generi del profilo lettore presenta un bug architetturale: gli override vengono applicati **prima** della normalizzazione dei pesi, distorcendo visivamente le barre percentuali di tutti i generi. Questo PRD descrive il refactor per separare lo score visivo dallo score computazionale e per semplificare la UI rimuovendo il pulsante "Modifica".

***

## Problema attuale

### Bug logico in `lib/tasteProfile.ts`

Il codice attuale (righe 201-219) applica i moltiplicatori override sul `weightSum` raw, e solo successivamente calcola il `maxWeight` usato per normalizzare:

```ts
// ❌ Override applicato prima della normalizzazione
if (override === 'boost') finalWeight *= 2.0
else if (override === 'suppress') finalWeight *= 0.1

if (finalWeight > maxWeight) maxWeight = finalWeight  // maxWeight è ora distorto
```

**Effetto concreto:** fare boost a un genere lo porta al 100%, abbassando visivamente tutti gli altri generi — anche quelli non toccati dall'utente. L'utente vede le barre cambiare senza aver aggiunto nuovi libri, il che è controintuitivo.

### Problema UI

- Il pulsante "Modifica" nasconde i controlli e aggiunge un tap inutile
- I testi "− Meno" e "+ Di più" sono poco chiari e poco compatti
- Non è visibile a colpo d'occhio quali generi hanno un override attivo

***

## Soluzione proposta

### Principio cardine

> Lo **score visivo** (barre + %) riflette sempre i dati reali dell'utente e non cambia mai a causa degli override. Gli override sono una **preferenza soggettiva** sovrapposta ai dati, usata dal sistema per ordinare e consigliare.

### Architettura dei due score

```
score_display  = normalize(weightSum_raw)            → usato solo per UI (barre, %)
score_ranking  = score_display × override_multiplier → usato per tutto il resto
```

**Moltiplicatori:**

| Stato override | Moltiplicatore | Campo DB |
|----------------|---------------|----------|
| Nessuno        | `×1.0`       | — |
| Boost          | `×2.0`       | `boost` |
| Downgrade      | `×0.3`       | `suppress` |

> **Nota:** il campo DB rimane `suppress` per retrocompatibilità. La UI usa il termine "downgrade" visivamente ma il valore salvato è `suppress`.

### Fix del calcolo in `lib/tasteProfile.ts`

Il campo `score` nell'array `genreAffinities` conterrà sempre il valore normalizzato senza override. Verrà aggiunto un campo `scoreRanking` calcolato post-normalizzazione:

```ts
// ✅ Normalizzazione senza override
const genreAffinities = genreAffinitiesRaw.map(g => ({
  ...g,
  score: maxWeight > 0 ? Math.round((g.score / maxWeight) * 100) : 0
})).sort((a, b) => b.score - a.score)

// ✅ Override applicato DOPO, su score già normalizzato
const genreAffinitiesWithRanking = genreAffinities.map(g => {
  const override = genreOverrides.get(g.genre)
  let multiplier = 1.0
  if (override === 'boost') multiplier = 2.0
  else if (override === 'suppress') multiplier = 0.3
  return {
    ...g,
    scoreRanking: Math.round(g.score * multiplier)
  }
})
```

**`scoreRanking`** è il valore usato da Bibliotecario AI, ordinamento generi nel profilo, e libri consigliati. `score` rimane invariato e visivo.

### Cap sui moltiplicatori interni (bonus fix)

Per evitare che un singolo libro con rating 5 + liked + favorite + recente domini un intero genere, aggiungere un cap:

```ts
entryWeight = Math.min(entryWeight, 8.0)
```

Il peso massimo attuale è: 3.0 (rating 5 completato) × 2.5 (liked+favorite) × 1.5 (recency) = **11.25**. Il cap a 8.0 limita i casi estremi mantenendo le differenze significative.

***

## Redesign UI

### Rimozione del pulsante "Modifica"

Il bottone `editToggle` e lo state `editGenres` vengono rimossi. Le icone di boost/downgrade sono **sempre visibili** su ogni riga genere, discrete, senza richiedere un tap aggiuntivo.

### Nuova anatomia riga genere

```
[NomeGenere]  [↑ boost icon]  [↓ downgrade icon]     XX%
[============================barra====================]
```

- Le icone usano **inline SVG** (frecce ↑ e ↓) — il progetto non usa icon library esterne
- **Stato neutro:** icona colore `var(--text-faint)`, nessun background
- **Boost attivo:** icona `var(--accent)` con background `var(--accent)` al 10% opacity
- **Downgrade attivo:** icona `var(--text-muted)` con background `var(--text-muted)` al 10% opacity
- Click su icona già attiva → toggle off (torna neutro)
- Click su icona opposta → switcha direttamente senza passare per neutro

La barra non cambia mai colore o ampiezza a causa degli override.

### Hint contestuale

Rimuovere il `tasteHint` attuale (visibile solo in edit mode). Sostituire con una riga fissa sotto la sezione generi, sempre visibile, stile caption:

```
↑ boost e ↓ downgrade guidano i consigli del Bibliotecario AI
```

***

## File da modificare

| File | Tipo modifica |
|------|---------------|
| `lib/tasteProfile.ts` | Fix normalizzazione, aggiunta `scoreRanking` nell'interfaccia e nel return, cap `entryWeight` a 8.0 |
| `app/api/profile/taste/overrides/route.ts` | Nessuna modifica necessaria — logica corretta |
| `app/(app)/profile/page.tsx` | Rimozione `editGenres` state e bottone, nuove icone toggle inline SVG, ordinamento per `scoreRanking` |
| `app/(app)/profile/page.module.css` | Nuovi stili per icone toggle (`.genreOverrideIcon`, `.genreOverrideActive`), rimozione stili `.editToggle` |
| `app/api/assistant/route.ts` | Usare `scoreRanking` al posto di `score` nei prompt AI |
| `app/api/recommendations/route.ts` | Usare `scoreRanking` al posto di `score` nei prompt AI e nel profile hash |
| `app/api/books/discovery/route.ts` | L'ordinamento dei generi ora segue `scoreRanking` (già implicito dal sort) |
| `app/api/profile/archetype/route.ts` | L'ordinamento dei generi ora segue `scoreRanking` (già implicito dal sort) |
| `app/api/ai/insights/route.ts` | Usare `scoreRanking` nel prompt AI dove serve come "peso" |
| `app/api/ai/goals/route.ts` | L'ordinamento dei generi ora segue `scoreRanking` (già implicito dal sort) |

***

## Comportamento del toggle (dettaglio)

La funzione `handleOverride` in `page.tsx` non cambia strutturalmente — gestisce già il toggle off quando il tipo è uguale all'override corrente. L'unica modifica è rimuovere la condizione `editGenres` che wrappa i bottoni.

```ts
// Logica attuale — corretta, da mantenere
const effective = localOverrides[genre] === type ? null : type
```

***

## Acceptance Criteria

- [ ] Le barre percentuali dei generi **non cambiano** dopo aver attivato boost o downgrade
- [ ] Le icone boost/downgrade sono visibili su ogni riga genere **senza** premere "Modifica"
- [ ] Le icone usano inline SVG (nessuna libreria esterna)
- [ ] Click su icona attiva la toglia (ritorna neutro)
- [ ] Click su icona opposta switcha direttamente
- [ ] I generi nel profilo sono ordinati per `scoreRanking` (non `score`)
- [ ] Il Bibliotecario AI e i consumer usano `scoreRanking` per i consigli
- [ ] `entryWeight` è cappato a `8.0`
- [ ] Il pulsante "Modifica" è rimosso
- [ ] L'hint è sempre visibile sotto la sezione generi
- [ ] Il campo DB rimane `suppress` (nessun rename)

***

## Out of scope

- Override sul singolo libro (non previsto)
- Modifica visiva della barra in base agli override (intenzionalmente escluso)
- Cambio del nome campo `score` nell'API response (per retrocompatibilità con altri consumer)
- Rename del campo DB da `suppress` a `downgrade` (rimane `suppress`)
