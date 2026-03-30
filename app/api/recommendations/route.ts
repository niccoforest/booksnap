import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildTasteProfile } from '@/lib/tasteProfile'
import { callLLM } from '@/lib/llm'
import { enrichBookMetadata } from '@/lib/bookMetadata'
import { Book } from '@/models/Book'
import { Library } from '@/models/Library'
import '@/models/Book'
import { connectDB } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

    // We can use a simple memory cache or rely on client-side caching if no DB cache is implemented
    // For now, let's compute it. In production, we'd cache this in MongoDB.
    
    // 1. Get taste profile
    await connectDB()
    const profile = await buildTasteProfile(user.userId)

    // Get IDs of books already in user's library
    const userLibraries = await Library.find({ userId: user.userId }).populate('books.bookId')
    const libraryBookIds = new Set<string>()
    const libraryTitles = new Set<string>()
    for (const lib of userLibraries) {
      for (const entry of lib.books) {
        const bk = entry.bookId as any
        if (bk?._id) libraryBookIds.add(bk._id.toString())
        if (bk?.title) libraryTitles.add(bk.title.toLowerCase())
      }
    }

    if (profile.stats.totalBooks === 0) {
      return NextResponse.json({
        recommendations: [
          { _id: '', title: "Dune", author: "Frank Herbert", matchReason: "Un capolavoro assoluto della fantascienza per iniziare.", coverUrl: "" },
          { _id: '', title: "Il Signore degli Anelli", author: "J.R.R. Tolkien", matchReason: "Il fantasy per eccellenza, da leggere almeno una volta.", coverUrl: "" },
          { _id: '', title: "1984", author: "George Orwell", matchReason: "Un classico distopico imperdibile.", coverUrl: "" }
        ]
      })
    }

    // 2. Build prompt — include exclusion list so LLM doesn't suggest them
    const alreadyRead = profile.recentlyCompleted.map(b => `"${b.title}" di ${b.author}`).join(', ')
    const prompt = `
Sei un libraio esperto. Dato questo profilo lettore:
- Generi preferiti: ${profile.genreAffinities.slice(0, 3).map(g => `${g.genre} (score: ${g.score})`).join(', ')}
- Autori preferiti: ${profile.favoriteAuthors.slice(0, 3).map(a => a.name).join(', ')}
- Libri già letti/in libreria (NON suggerire questi): ${alreadyRead}

Suggerisci 5 libri DIVERSI da quelli già letti che l'utente potrebbe amare.
3 nei suoi generi preferiti, 1 scoperta in un genere adiacente, 1 classico che potrebbe non conoscere.

Rispondi SOLO con un JSON valido con questa struttura esatta, senza markdown o altro testo:
{
  "recommendations": [
    {
      "title": "Titolo del libro",
      "author": "Autore",
      "matchReason": "Spiega in 1 breve frase perché lo consigli a QUESTO utente specifico."
    }
  ]
}
`

    // 3. Call LLM
    const response = await callLLM(prompt)
    let textStr = response.content.replace(/```json/g, '').replace(/```/g, '').trim()
    
    let parsed
    try {
      parsed = JSON.parse(textStr)
    } catch (err) {
      console.error('Failed to parse recommendations JSON:', textStr)
      return NextResponse.json({ error: 'Errore nella generazione delle raccomandazioni' }, { status: 500 })
    }
    
    const recs = parsed.recommendations || []
    
    // Enrich each book with external metadata
    const enriched = await Promise.all(
      recs.map(async (b: any) => {
        const metadata = await enrichBookMetadata(b)

        // Persist to Book collection if not already there
        let dbBook = metadata.isbn ? await Book.findOne({ isbn: metadata.isbn }) : null
        if (!dbBook) {
          dbBook = await Book.findOne({
            title: { $regex: new RegExp(metadata.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
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

        const bookId = dbBook._id.toString()
        // Skip if already in user's library
        if (libraryBookIds.has(bookId)) return null
        if (libraryTitles.has((metadata.title || b.title).toLowerCase())) return null

        return {
          ...b,
          _id: bookId,
          coverUrl: metadata.coverUrl || dbBook.coverUrl,
          author: metadata.authors?.[0] || b.author,
          title: metadata.title || b.title
        }
      })
    )

    const filtered = enriched.filter(Boolean)
    return NextResponse.json({ recommendations: filtered })

  } catch (error) {
    console.error('[API recommendations]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
