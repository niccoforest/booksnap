# DB Tools — Pulizia e Ispezione

## Setup (ogni sessione)

```bash
export $(cat .env.local | grep -v '#' | xargs)
```

---

## Pulizia: `scripts/cleanup.ts`

```bash
npx tsx scripts/cleanup.ts [opzione]
```

| Opzione | Cosa fa |
|---------|---------|
| `all` | Elimina tutto tranne User, ricrea la library di default per ogni utente |
| `books` | Svuota l'array `books` da tutte le Library (mantiene le library stesse) |
| `locations` | Rimuove i campi `location` e `behindRow` da tutti i BookEntry |
| `extra` | Elimina conversations, activities, challenges, notifications, bookshelves, scanhistories |

### Esempi

```bash
npx tsx scripts/cleanup.ts all
npx tsx scripts/cleanup.ts books
npx tsx scripts/cleanup.ts locations
npx tsx scripts/cleanup.ts extra
```

---

## Ispezione: `scripts/inspect-db.ts`

```bash
npx tsx scripts/inspect-db.ts [opzione]
```

| Opzione | Cosa mostra |
|---------|-------------|
| `summary` | Conteggio documenti per ogni collection |
| `users` | Lista utenti (senza passwordHash) |
| `libraries` | Tutte le library con numero di libri per ognuna |
| `books` | Lista libri nel DB (titolo, autori, isbn) |
| `locations` | Tutti i valori di location usati nei BookEntry |

### Esempi

```bash
npx tsx scripts/inspect-db.ts summary
npx tsx scripts/inspect-db.ts users
npx tsx scripts/inspect-db.ts libraries
npx tsx scripts/inspect-db.ts books
npx tsx scripts/inspect-db.ts locations
```

---

## Alias utili (opzionale)

Aggiungi al tuo `.bashrc` / `.zshrc`:

```bash
alias bsenv='export $(cat .env.local | grep -v "#" | xargs)'
alias bsclean='bsenv && npx tsx scripts/cleanup.ts'
alias bsinspect='bsenv && npx tsx scripts/inspect-db.ts'
```

Poi usi semplicemente:

```bash
bsclean all
bsinspect summary
```
