<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BookSnap Agent Rules

## Project Context

BookSnap is a mobile-first Italian-language PWA for book library management with AI-powered scanning and recommendations. The app runs on Next.js 16 App Router with MongoDB, JWT auth, and dual LLM support (Ollama local / OpenRouter cloud). Dark mode is fully implemented via `[data-theme="dark"]` CSS variables. Push notifications are supported via Service Worker (`public/sw.js`).

## Critical Rules

### Before Writing Code
1. **Read existing code first.** Understand the current pattern in the file/module before modifying.
2. **Check `lib/` for existing utilities** before creating new helpers. Auth logic is in `lib/auth.ts`, DB connection in `lib/mongodb.ts`, LLM calls in `lib/llm.ts`, book metadata fetching in `lib/bookMetadata.ts`.
3. **Check `globals.css` for existing design tokens** before adding inline styles or new CSS variables.
4. **Follow the Italian UI language.** All user-facing text must be in Italian. Do not introduce English strings in the UI.

### App Router Conventions
- Pages in `app/(app)/` are protected (require auth). Pages in `app/(auth)/` are public.
- Client components use `'use client'` directive and fetch data via `useEffect` + `/api/*` calls.
- API routes are in `app/api/` and use `NextRequest`/`NextResponse` from `next/server`.
- Auth check in API routes: call `getAuthUser(request)` from `lib/auth.ts`, return 401 if null.
- Auth check on client: if `fetch` returns 401, redirect to `/login`.

### Styling Rules
- Use **CSS Modules** (`page.module.css`) for page-specific styles.
- Use **globals.css variables** for colors (`--accent`, `--text-primary`, etc.), spacing (`--spacing-*`), radii (`--radius-*`), shadows (`--shadow-*`).
- Status colors are predefined: `--status-reading` (blue), `--status-completed` (green), `--status-to-read` (amber), `--status-abandoned` (red), `--status-lent` (purple).
- Bottom nav is 72px tall (`--bottom-nav-height`). All pages must account for this with `padding-bottom`.
- Mobile-first. Touch targets minimum 44px. Use `env(safe-area-inset-bottom)` for notched devices.

### Database Rules
- Always call `import dbConnect from '@/lib/mongodb'` and `await dbConnect()` before any Mongoose operation in API routes.
- Book deduplication: check by `isbn` first, then by `title + authors` match before creating new Book documents.
- Library's `books` array contains embedded `BookEntry` subdocuments (not separate collection).
- User passwords: bcrypt with salt rounds 12. Never return `passwordHash` in API responses.
- **Reaction system:** BookEntry uses two separate booleans — `liked` (heart, light signal) and `favorite` (star, strong signal). These feed into the Taste Profile Engine for recommendation scoring.
- **Taste Profile Engine:** `lib/tasteProfile.ts` builds a weighted genre/author affinity profile from the user's library. `liked`/`favorite` signals boost scoring. This profile is the primary input for all AI recommendations (assistant, proactive recs, similar books).

### Silent Usage Tracking
- **Every new AI or Scanner endpoint MUST increment usage counters** on the User document: `usageStats.aiQueries` and/or `usageStats.scans`. This is a hard rule — no exceptions.
- The counters are silent (not exposed to the user yet). They will be used in Phase 10 (Monetization) for freemium gating.
- Implementation: after a successful AI call or scan, run `User.updateOne({ _id: userId }, { $inc: { 'usageStats.aiQueries': 1 } })` (or `.scans` for scan endpoints).
- Do NOT add the `usageStats` field to User schema until the first endpoint that needs it — Mongoose will create it on first `$inc` automatically.

### LLM Integration
- Use `callLLM(prompt, imageBase64?)` from `lib/llm.ts`. Do not call Ollama or OpenRouter directly.
- LLM responses should always be parsed as JSON. Wrap in try/catch — LLMs can return malformed responses.
- Strip markdown code fences (```json...```) from LLM output before parsing.

### Book Metadata Enrichment
- Use `fetchBookMetadata()` or `enrichBookMetadata()` from `lib/bookMetadata.ts`. Do not call Google Books or Open Library directly.
- **Google Books API** is the primary source (covers HD, descriptions, categories, page count, language).
- **Open Library** is the automatic fallback if Google Books returns no results.
- `fetchBookMetadata(recognized)` — for scan: takes `{ title, author, isbn? }`, returns full metadata.
- `enrichBookMetadata(book)` — for assistant: merges external data with LLM-provided description/genres (preserves LLM data when external is empty).
- `GOOGLE_BOOKS_API_KEY` env var is optional — increases daily quota but works without it.

### Security
- JWT tokens stored in HttpOnly cookies only. Never expose tokens to client JS.
- Validate ObjectId format before using in Mongoose queries to prevent injection.
- Sanitize user input (username, email, review text) before database operations.
- Do not log sensitive data (passwords, tokens, API keys).

### API Response Format
```typescript
// Success
NextResponse.json({ libraries: [...] })
NextResponse.json({ book: {...} })

// Error
NextResponse.json({ error: 'Descrizione errore' }, { status: 4xx })
```

### Component Patterns
- Inline SVG icons (no icon library). Keep them small and semantic with `aria-label`.
- Loading states use the `.skeleton` class with shimmer animation from globals.css.
- Toast notifications use `.toast-container` + `.toast-success`/`.toast-error` from globals.css.
- Book covers use aspect-ratio 2/3, with `.book-cover-placeholder` fallback.

## File Ownership

| Area | Files | Owner concern |
|------|-------|---------------|
| Auth | `lib/auth.ts`, `app/api/auth/*`, `models/User.ts` | Security, cookie handling |
| Books | `models/Book.ts`, `app/api/books/*` | Deduplication, search indexing |
| Libraries | `models/Library.ts`, `app/api/libraries/*` | User isolation, embedded BookEntry |
| LLM | `lib/llm.ts`, `app/api/scan/*`, `app/api/assistant/*` | Prompt engineering, JSON parsing |
| Metadata | `lib/bookMetadata.ts` | Google Books (primary) + Open Library (fallback), timeouts |
| UI | `app/(app)/*`, `components/*`, `globals.css` | Italian text, mobile-first, CSS vars |
| Config | `next.config.ts`, `vercel.json`, `package.json` | Build settings, deployment |
