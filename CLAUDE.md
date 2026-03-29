# BookSnap - Project Guide

@AGENTS.md

## Overview

BookSnap is a mobile-first PWA for managing personal book libraries. Users scan book covers with their camera, an LLM identifies the books, and external APIs enrich the metadata. Books are organized in personal libraries with reading status, ratings, and reviews. An AI assistant recommends books via natural language.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · MongoDB/Mongoose · JWT auth · Ollama/OpenRouter LLM · Google Books API · Open Library API

## Architecture

```
app/
  (app)/          → Protected pages (library, scan, search, book/[id], profile)
  (auth)/         → Public auth pages (login, register)
  api/            → Route Handlers (auth, books, libraries, scan, assistant)
components/       → Shared UI components (navigation/BottomNav)
lib/              → Core utilities (auth.ts, mongodb.ts, llm.ts, bookMetadata.ts)
models/           → Mongoose schemas (User, Book, Library)
public/           → Static assets + PWA manifest
```

### Key patterns

- **Auth flow:** JWT in HttpOnly cookie (`booksnap_token`), 30-day expiry. `getAuthUser(req)` extracts user from cookie. API routes check auth manually; client pages redirect on 401.
- **LLM abstraction:** `lib/llm.ts` exports `callLLM(prompt, imageBase64?)` — auto-selects Ollama (dev) or OpenRouter (prod) based on `OPENROUTER_API_KEY` presence.
- **Book enrichment:** `lib/bookMetadata.ts` provides `fetchBookMetadata()` and `enrichBookMetadata()`. Google Books API is the primary source (covers, descriptions, categories, ratings), with Open Library as fallback. Results are upserted into MongoDB.
- **Styling:** CSS Modules per page + `globals.css` design system. CSS variables for colors, spacing, radii. No CSS framework.
- **Language:** UI is entirely in Italian. No i18n library yet.

## Database Models

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **User** | email, username, passwordHash, preferences (favoriteGenres, language, theme) | bcrypt salt 12, theme field exists but dark mode not implemented |
| **Book** | isbn, title, authors[], coverUrl, description, genres, googleBooksId, openLibraryKey | Text index on title+authors |
| **Library** | userId, name, emoji, isDefault, books[] (embedded BookEntry) | BookEntry has status, rating, review, tags, notes, lentTo |

### Reading statuses
`to_read` · `reading` · `completed` · `abandoned` · `lent`

## API Routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/auth/register` | No | Create account + default library |
| POST | `/api/auth/login` | No | Authenticate, set cookie |
| GET | `/api/auth/me` | Yes | Current user info |
| POST | `/api/auth/logout` | No | Clear cookie |
| GET | `/api/books?q=&limit=` | No | Search books by title/author |
| GET | `/api/books/[id]` | No | Book detail |
| GET | `/api/libraries` | Yes | All user libraries with populated books |
| POST | `/api/libraries` | Yes | Create library |
| POST | `/api/libraries/[id]/books` | Yes | Add book to library |
| PATCH | `/api/libraries/[id]/books` | Yes | Update book entry (status, rating, review...) |
| POST | `/api/scan` | Yes | Image → LLM → book recognition |
| POST | `/api/assistant` | Yes | Query → LLM → book recommendations |

## Environment Variables

```env
MONGODB_URI=              # MongoDB Atlas connection string
JWT_SECRET=               # 32+ char secret for JWT signing
OLLAMA_BASE_URL=          # Local Ollama (default: http://localhost:11434)
OLLAMA_MODEL=             # Ollama model (default: llava)
OPENROUTER_API_KEY=       # If set, uses OpenRouter instead of Ollama
OPENROUTER_MODEL=         # OpenRouter model (default: google/gemini-flash-1.5)
GOOGLE_BOOKS_API_KEY=     # Optional: increases Google Books quota (works without, 100 req/day limit)
NEXT_PUBLIC_APP_URL=      # App base URL
```

## Development

```bash
npm run dev     # Start dev server on :3000
npm run build   # Production build
npm run lint    # ESLint check
```

**Local LLM:** Run Ollama with `ollama run gemma3:4b-it-qat` for scan/assistant features.

## Conventions

- **Files:** kebab-case for files, PascalCase for components
- **Styles:** CSS Modules (`page.module.css`) per page, globals.css for shared design tokens
- **API responses:** Always `NextResponse.json({ ... })`, errors include `{ error: string }`
- **Client pages:** `'use client'` directive, fetch in `useEffect`, handle 401 → redirect
- **Types:** Define interfaces inline in page/component files (no shared types dir yet)
- **No tests yet** — test infrastructure needs to be added

## Known Gaps

- No middleware for route protection (client-side redirect only)
- No rate limiting on API routes
- No image size validation on scan endpoint
- No book deletion from library
- No library edit/delete
- No dark mode (DB field exists, UI not implemented)
- No service worker / offline support
- PWA icons missing (manifest references `/icon.svg`)
- No error boundaries
- All strings hardcoded in Italian (no i18n)
