import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'
import { enrichBookMetadata } from '@/lib/bookMetadata'

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

    // Enrich each book with external metadata (Google Books → Open Library)
    await connectDB()
    const enriched = await Promise.all(
      books.map(async (b) => {
        const metadata = await enrichBookMetadata(b)

        // Persist to Book collection if not already there
        let dbBook = metadata.isbn ? await Book.findOne({ isbn: metadata.isbn }) : null
        if (!dbBook) {
          dbBook = await Book.findOne({
            title: { $regex: new RegExp(metadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
          })
        }
        if (!dbBook) {
          dbBook = await Book.create({
            isbn: metadata.isbn,
            title: metadata.title,
            authors: metadata.authors,
            genres: metadata.genres,
            description: metadata.description,
            publishedYear: metadata.publishedYear,
            coverUrl: metadata.coverUrl,
            pageCount: metadata.pageCount,
            language: metadata.language,
            googleBooksId: metadata.googleBooksId,
            openLibraryKey: metadata.openLibraryKey,
          })
        }

        return {
          ...b,
          _id: dbBook._id.toString(),
          coverUrl: metadata.coverUrl || dbBook.coverUrl,
          genres: metadata.genres?.length ? metadata.genres : (b.genres || []),
          description: metadata.description || b.description,
          pageCount: metadata.pageCount || dbBook.pageCount,
        }
      })
    )

    return NextResponse.json({ books: enriched, query })
  } catch (error) {
    console.error('[assistant]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
