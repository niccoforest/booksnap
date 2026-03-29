/**
 * Unified book metadata fetching.
 * Primary: Google Books API (richer data, better covers, descriptions, categories)
 * Fallback: Open Library API
 */

export interface BookMetadata {
  isbn?: string
  title: string
  authors: string[]
  publisher?: string
  publishedYear?: number
  genres: string[]
  coverUrl?: string
  description?: string
  pageCount?: number
  language?: string
  openLibraryKey?: string
  googleBooksId?: string
}

interface RecognizedBook {
  title: string
  author: string
  isbn?: string | null
  confidence?: number
}

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'
const TIMEOUT_MS = 4000

function withTimeout(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

// ─── Google Books ─────────────────────────────────────────

async function searchGoogleBooks(recognized: RecognizedBook): Promise<BookMetadata | null> {
  try {
    const params = new URLSearchParams({ maxResults: '1' })

    // Build query: ISBN is most precise, otherwise title+author
    if (recognized.isbn) {
      params.set('q', `isbn:${recognized.isbn}`)
    } else {
      const parts: string[] = []
      if (recognized.title) parts.push(`intitle:${recognized.title}`)
      if (recognized.author) parts.push(`inauthor:${recognized.author}`)
      params.set('q', parts.join('+'))
    }

    // API key is optional — increases daily quota from 100 to 1000+
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    if (apiKey) params.set('key', apiKey)

    const res = await fetch(`${GOOGLE_BOOKS_API}?${params}`, {
      signal: withTimeout(TIMEOUT_MS),
    })

    if (!res.ok) return null

    const data = await res.json()
    const item = data.items?.[0]
    if (!item) return null

    const v = item.volumeInfo

    // Extract best ISBN (prefer ISBN_13)
    const identifiers = v.industryIdentifiers || []
    const isbn13 = identifiers.find((id: any) => id.type === 'ISBN_13')?.identifier
    const isbn10 = identifiers.find((id: any) => id.type === 'ISBN_10')?.identifier
    const isbn = isbn13 || isbn10 || recognized.isbn || undefined

    // Best available cover (prefer larger)
    const coverUrl = v.imageLinks?.extraLarge
      || v.imageLinks?.large
      || v.imageLinks?.medium
      || v.imageLinks?.thumbnail
      || v.imageLinks?.smallThumbnail
      || undefined

    // Clean up cover URL: Google returns http, switch to https and remove edge=curl
    const cleanCoverUrl = coverUrl
      ?.replace('http://', 'https://')
      ?.replace('&edge=curl', '')

    return {
      isbn,
      title: v.title || recognized.title,
      authors: v.authors || [recognized.author],
      publisher: v.publisher,
      publishedYear: v.publishedDate ? parseInt(v.publishedDate) : undefined,
      genres: v.categories || [],
      coverUrl: cleanCoverUrl,
      description: v.description,
      pageCount: v.pageCount,
      language: v.language,
      googleBooksId: item.id,
    }
  } catch (err) {
    console.error('[searchGoogleBooks]', err instanceof Error ? err.message : err)
    return null
  }
}

// ─── Open Library (fallback) ──────────────────────────────

async function searchOpenLibrary(recognized: RecognizedBook): Promise<BookMetadata | null> {
  try {
    // Try ISBN lookup first
    if (recognized.isbn) {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${recognized.isbn}&format=json&jscmd=data`,
        { signal: withTimeout(TIMEOUT_MS) }
      )
      const data = await res.json()
      const book = data[`ISBN:${recognized.isbn}`]
      if (book) {
        return {
          isbn: recognized.isbn,
          title: book.title,
          authors: book.authors?.map((a: any) => a.name) || [recognized.author],
          publisher: book.publishers?.[0]?.name,
          publishedYear: book.publish_date ? parseInt(book.publish_date) : undefined,
          genres: book.subjects?.map((s: any) => s.name).slice(0, 5) || [],
          coverUrl: book.cover?.large || book.cover?.medium || book.cover?.small,
          description: typeof book.excerpts?.[0]?.text === 'string' ? book.excerpts[0].text : undefined,
          openLibraryKey: book.key,
          pageCount: book.number_of_pages,
        }
      }
    }

    // Fallback: search by title + author
    const query = encodeURIComponent(`${recognized.title} ${recognized.author}`)
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=1&fields=key,title,author_name,isbn,cover_i,number_of_pages_median,publisher,first_publish_year,subject`,
      { signal: withTimeout(TIMEOUT_MS) }
    )
    const data = await res.json()

    if (data.docs?.[0]) {
      const doc = data.docs[0]
      const isbn = doc.isbn?.[0]
      const coverId = doc.cover_i
      return {
        isbn,
        title: doc.title,
        authors: doc.author_name || [recognized.author],
        publisher: doc.publisher?.[0],
        publishedYear: doc.first_publish_year,
        genres: doc.subject?.slice(0, 5) || [],
        coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined,
        openLibraryKey: doc.key,
        pageCount: doc.number_of_pages_median,
      }
    }
  } catch (err) {
    console.error('[searchOpenLibrary]', err instanceof Error ? err.message : err)
  }

  return null
}

// ─── Public API ───────────────────────────────────────────

/**
 * Fetch book metadata: Google Books first, Open Library fallback.
 * Always returns at least the title and author from the input.
 */
export async function fetchBookMetadata(recognized: RecognizedBook): Promise<BookMetadata> {
  // Try Google Books first
  const googleResult = await searchGoogleBooks(recognized)
  if (googleResult) return googleResult

  // Fallback to Open Library
  const olResult = await searchOpenLibrary(recognized)
  if (olResult) return olResult

  // Last resort: return what we have
  return {
    title: recognized.title,
    authors: [recognized.author],
    genres: [],
  }
}

/**
 * Enrich an already-identified book (from LLM assistant) with external metadata.
 * Merges external data without overwriting LLM-provided fields like description/genres.
 */
export async function enrichBookMetadata(
  book: { title: string; author: string; isbn?: string | null; genres?: string[]; description?: string; year?: number }
): Promise<BookMetadata> {
  const recognized: RecognizedBook = {
    title: book.title,
    author: book.author,
    isbn: book.isbn,
  }

  const external = await fetchBookMetadata(recognized)

  // Merge: keep LLM-provided description/genres if external ones are empty
  return {
    ...external,
    title: external.title || book.title,
    authors: external.authors?.length ? external.authors : [book.author],
    genres: external.genres?.length ? external.genres : (book.genres || []),
    description: external.description || book.description,
    publishedYear: external.publishedYear || book.year,
  }
}
