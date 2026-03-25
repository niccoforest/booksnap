import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'

const ASSISTANT_PROMPT = (query: string) => `You are BookSnap's librarian assistant. The user is looking for book recommendations.

User request: "${query}"

Return a JSON array of up to 5 book recommendations. Each item must exactly follow this structure:
{
  "title": "Book Title",
  "author": "Author Name",
  "year": 2020,
  "genres": ["Genre1", "Genre2"],
  "description": "A 2-3 sentence description of the book that explains why it matches the user's request.",
  "isbn": null
}

Rules:
- Only recommend real, existing books
- Match the user's request as closely as possible (mood, genre, similar books, themes)
- Be concise but compelling in descriptions
- Return ONLY a valid JSON array, no markdown fences, no explanation
- If the request is in Italian, respond with Italian descriptions`

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { query } = await request.json()
    if (!query?.trim()) return NextResponse.json({ error: 'Query richiesta' }, { status: 400 })

    const llmResult = await callLLM(ASSISTANT_PROMPT(query))

    let books: any[]
    try {
      // Strip potential markdown fences
      const clean = llmResult.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      books = JSON.parse(clean)
      if (!Array.isArray(books)) throw new Error('Not an array')
    } catch {
      return NextResponse.json({ error: 'Risposta non valida dal modello', raw: llmResult.content }, { status: 422 })
    }

    // Try to enrich each book with cover from Open Library
    await connectDB()
    const enriched = await Promise.all(
      books.map(async (b) => {
        try {
          const q = encodeURIComponent(`${b.title} ${b.author}`)
          const res = await fetch(
            `https://openlibrary.org/search.json?q=${q}&limit=1&fields=key,cover_i,isbn,number_of_pages_median,first_publish_year`,
            { signal: AbortSignal.timeout(3000) }
          )
          const data = await res.json()
          const doc = data.docs?.[0]
          if (doc) {
            b.isbn = doc.isbn?.[0] || null
            b.coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null
            b.pageCount = doc.number_of_pages_median || null
          }
        } catch { /* ignore enrichment failures */ }

        // Persist to Book collection if not already there
        let dbBook = b.isbn ? await Book.findOne({ isbn: b.isbn }) : null
        if (!dbBook) {
          dbBook = await Book.findOne({ title: new RegExp(`^${b.title}$`, 'i') })
        }
        if (!dbBook) {
          dbBook = await Book.create({
            isbn: b.isbn,
            title: b.title,
            authors: [b.author],
            genres: b.genres || [],
            description: b.description,
            publishedYear: b.year,
            coverUrl: b.coverUrl,
            pageCount: b.pageCount,
          })
        }

        return { ...b, _id: dbBook._id.toString(), coverUrl: b.coverUrl || dbBook.coverUrl }
      })
    )

    return NextResponse.json({ books: enriched, query })
  } catch (error) {
    console.error('[assistant]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
