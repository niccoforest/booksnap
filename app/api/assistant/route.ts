import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'
import { Library } from '@/models/Library'
import { Conversation } from '@/models/Conversation'
import { enrichBookMetadata } from '@/lib/bookMetadata'
import { buildTasteProfile, TasteProfile } from '@/lib/tasteProfile'

// FIX 1 + FIX 5: Prompt interamente in italiano, con regole esplicite su lingua e generi
const ASSISTANT_PROMPT = (
  query: string,
  userBooks: string[],
  history: { role: string; content: string }[],
  profile: TasteProfile
) => {
  const historyBlock =
    history.length > 0
      ? `\nConversazione precedente:\n${history.map((m) => `${m.role === 'user' ? 'Utente' : 'Bibliotecario'}: ${m.content}`).join('\n')}\n`
      : ''

  // FIX 2: contesto libreria
  const libraryBlock =
    userBooks.length > 0
      ? `\nL'utente possiede già questi libri nella sua libreria:\n${userBooks.map((t) => `- ${t}`).join('\n')}\nNON consigliare libri già in questa lista. Usa questa lista per capire i gusti dell'utente.\n`
      : ''

  const profileBlock = `
PROFILO LETTORE:
- Generi preferiti: ${profile.genreAffinities.slice(0, 5).map(g => `${g.genre} (score ${g.score})`).join(', ')}
- Generi meno apprezzati: ${profile.genreAffinities.slice(-3).map(g => `${g.genre} (score ${g.score})`).join(', ')}
- Autori preferiti: ${profile.favoriteAuthors.slice(0, 3).map(a => `${a.name} (rating ${a.avgRating.toFixed(1)})`).join(', ')}
- Letture recenti completate: ${profile.recentlyCompleted.map(l => `"${l.title}"`).join(', ')}
- Sta leggendo: ${profile.currentlyReading.map(l => `"${l.title}"`).join(', ')}
- Statistiche: ${profile.stats.totalBooks} libri totali, rating medio dato ${profile.stats.avgRating}, preferisce libri ${profile.stats.preferredPageRange}

REGOLE PERSONALIZZAZIONE:
- Favorisci raccomandazioni nei generi con score alto, MA suggerisci anche 1 libro "fuori zona" se pertinente alla query
- Se l'utente chiede genericamente "cosa leggere", usa il profilo per guidare i suggerimenti
- Evita generi con score < 20 a meno che l'utente li chieda esplicitamente
- Tieni conto delle letture recenti per evitare ridondanza tematica
`

  return `Sei il Bibliotecario AI di BookSnap. Aiuti gli utenti a scoprire nuovi libri.
${historyBlock}${libraryBlock}${profileBlock}
Richiesta dell'utente: "${query}"

Rispondi con un array JSON di massimo 5 libri consigliati. Ogni elemento deve avere questa struttura esatta:
{
  "title": "Titolo del libro",
  "author": "Nome Autore",
  "year": 2020,
  "genres": ["Genere1", "Genere2"],
  "description": "2-3 frasi in italiano che spiegano la trama (massimo 200 caratteri).",
  "matchReason": "Spiega in 1 frase perché questo libro è consigliato per QUESTO utente basandoti sul suo profilo.",
  "isbn": null
}

REGOLE OBBLIGATORIE:
- Rispondi SEMPRE in italiano. Le descrizioni devono essere in italiano.
- I generi devono essere in italiano (es. "Fantascienza", "Romanzo storico", "Thriller", "Saggio", "Fantasy")
- Consiglia solo libri reali e pubblicati
- Le descrizioni devono descrivere il libro, mentre matchReason spiega il match personalizzato
- Restituisci SOLO l'array JSON valido, senza markdown, senza spiegazioni aggiuntive`
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { query, conversationId, history: clientHistory } = await request.json()
    if (!query?.trim()) return NextResponse.json({ error: 'Query richiesta' }, { status: 400 })

    const rate = await checkRateLimit(user.userId, 'assistant')
    if (!rate.allowed) {
      return NextResponse.json(
        { error: `Limite richieste assistente giornaliero raggiunto (${RATE_LIMITS.assistant}/giorno). Riprova domani.` },
        { status: 429 }
      )
    }

    await connectDB()

    // Find or create conversation
    let conversation: any
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId: user.userId })
    }

    if (!conversation) {
      conversation = new Conversation({
        userId: user.userId,
        title: query.length > 50 ? query.substring(0, 47) + '...' : query,
        messages: [],
      })
    }

    // FIX 2: Recupera libri dalla libreria dell'utente per il contesto
    let userBookTitles: string[] = []
    try {
      const libraries = await Library.find({ userId: user.userId }).populate('books.bookId', 'title authors').lean()
      userBookTitles = libraries.flatMap((lib: any) =>
        (lib.books || [])
          .map((entry: any) => {
            const book = entry.bookId
            if (!book) return null
            const title = typeof book === 'object' ? book.title : null
            const author = typeof book === 'object' && book.authors?.[0] ? ` di ${book.authors[0]}` : ''
            return title ? `${title}${author}` : null
          })
          .filter(Boolean)
      )
    } catch (err) {
      console.error('[assistant] Failed to fetch user library:', err)
    }

    const tasteProfile = await buildTasteProfile(user.userId)

    // FIX 3: Memoria conversazionale — ultimi 10 messaggi dal client
    const conversationHistory: { role: string; content: string }[] = []
    if (Array.isArray(clientHistory)) {
      for (const msg of clientHistory.slice(-10)) {
        if (msg.role && msg.content) {
          conversationHistory.push({ role: msg.role, content: msg.content })
        }
      }
    }

    const prompt = ASSISTANT_PROMPT(query, userBookTitles, conversationHistory, tasteProfile)
    const llmResult = await callLLM(prompt)

    let books: any[]
    try {
      const clean = llmResult.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      // Extract array from potential surrounding text
      const arrayMatch = clean.match(/\[[\s\S]*\]/)
      books = JSON.parse(arrayMatch ? arrayMatch[0] : clean)
      if (!Array.isArray(books)) throw new Error('Not an array')
    } catch {
      return NextResponse.json({ error: 'Risposta non valida dal modello', raw: llmResult.content }, { status: 422 })
    }

    // Enrich each book with external metadata
    const enriched = await Promise.all(
      books.map(async (b) => {
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

        return {
          ...b,
          _id: dbBook._id.toString(),
          coverUrl: metadata.coverUrl || dbBook.coverUrl,
          // FIX 4: Priorità alla descrizione dell'LLM (corta e personalizzata)
          // FIX 5: Priorità ai generi dell'LLM (in italiano)
          genres: b.genres?.length ? b.genres : (metadata.genres || []),
          description: b.description || metadata.description,
          pageCount: metadata.pageCount || dbBook.pageCount,
        }
      })
    )

    // Persist conversation
    conversation.messages.push({ role: 'user', content: query })
    conversation.messages.push({ 
      role: 'assistant', 
      books: enriched, 
      query,
      createdAt: new Date() 
    })
    conversation.lastMessageAt = new Date()
    await conversation.save()

    return NextResponse.json({ 
      books: enriched, 
      query, 
      conversationId: conversation._id.toString() 
    })
  } catch (error) {
    console.error('[assistant]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
