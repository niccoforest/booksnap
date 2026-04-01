import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildTasteProfile, TasteProfile } from '@/lib/tasteProfile'
import { callLLM } from '@/lib/llm'
import { enrichBookMetadata } from '@/lib/bookMetadata'
import { Book } from '@/models/Book'
import { Library } from '@/models/Library'
import { User } from '@/models/User'
import '@/models/Book'
import { connectDB } from '@/lib/mongodb'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 ore

function computeProfileHash(profile: TasteProfile): string {
  return [
    profile.genreAffinities.slice(0, 5).map(g => `${g.genre}:${g.score}`).join(','),
    profile.favoriteTitles.join(','),
    profile.likedTitles.join(','),
    profile.stats.totalBooks,
  ].join('|')
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === 'true'

    // 1. Get taste profile
    await connectDB()
    const profile = await buildTasteProfile(user.userId)
    const profileHash = computeProfileHash(profile)

    // 2. Check MongoDB cache (skip on forceRefresh)
    if (!forceRefresh) {
      const dbUser = await User.findById(user.userId).select('aiCache.recommendations').lean() as any
      const cached = dbUser?.aiCache?.recommendations
      if (
        cached?.data?.length > 0 &&
        cached.profileHash === profileHash &&
        cached.expiresAt > new Date()
      ) {
        return NextResponse.json({ recommendations: cached.data, fromCache: true })
      }
    }

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

    // FX-8: liked/favorite signal blocks
    const reactionBlock = [
      profile.favoriteTitles.length > 0
        ? `- Libri "preferiti" ⭐ (segnale forte): ${profile.favoriteTitles.map(t => `"${t}"`).join(', ')}`
        : '',
      profile.likedTitles.length > 0
        ? `- Libri "piaciuti" ❤️ (segnale secondario): ${profile.likedTitles.map(t => `"${t}"`).join(', ')}`
        : '',
    ].filter(Boolean).join('\n')

    const prompt = `
Sei un libraio esperto. Dato questo profilo lettore:
- Generi preferiti: ${profile.genreAffinities.slice(0, 3).map(g => `${g.genre} (score: ${g.score})`).join(', ')}
- Autori preferiti: ${profile.favoriteAuthors.slice(0, 3).map(a => a.name).join(', ')}
${reactionBlock ? reactionBlock + '\n' : ''}- Libri già letti/in libreria (NON suggerire questi): ${alreadyRead}

${reactionBlock ? 'Dai MASSIMA PRIORITÀ ai generi e agli autori dei libri "preferiti" ⭐. I libri "piaciuti" ❤️ sono un segnale secondario ma significativo.\n' : ''}Suggerisci 5 libri DIVERSI da quelli già letti che l'utente potrebbe amare.
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

    // Save to cache + increment usageStats
    await User.updateOne({ _id: user.userId }, {
      'aiCache.recommendations': {
        data: filtered,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
        profileHash,
      },
      $inc: { 'usageStats.aiQueries': 1 },
    })

    return NextResponse.json({ recommendations: filtered })

  } catch (error) {
    console.error('[API recommendations]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
