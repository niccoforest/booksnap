import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callLLM } from '@/lib/llm'
import { connectDB } from '@/lib/mongodb'
import { Library } from '@/models/Library'
import { Book } from '@/models/Book'
import { isFuzzyMatch } from '@/lib/fuzzy'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { query } = await request.json()
    if (!query?.trim()) return NextResponse.json({ error: 'Query richiesta' }, { status: 400 })

    await connectDB()

    // Fetch user's library books with full details
    const libraries = await Library.find({ userId: user.userId })
      .populate({ path: 'books.bookId', model: Book })
      .lean() as any[]

    const allBooks: any[] = []
    libraries.forEach(lib => {
      lib.books?.forEach((entry: any) => {
        const book = entry.bookId
        if (book && book.title) {
          allBooks.push({
            id: book._id.toString(),
            title: book.title,
            authors: book.authors || [],
            genres: book.genres || [],
            status: entry.status,
            rating: entry.rating,
            publishedYear: book.publishedYear,
            pageCount: book.pageCount,
            description: book.description,
          })
        }
      })
    })

    if (allBooks.length === 0) {
      return NextResponse.json({ books: [], message: 'La tua libreria è vuota' })
    }

    // Try simple fuzzy matching first (fast path)
    const lowerQuery = query.toLowerCase()
    const quickMatches = allBooks.filter(book => 
      isFuzzyMatch(book.title, query) ||
      book.authors.some((a: string) => isFuzzyMatch(a, query)) ||
      book.genres.some((g: string) => g.toLowerCase().includes(lowerQuery))
    )

    // If we have good matches without LLM, return them
    if (quickMatches.length >= 2 && query.split(' ').length <= 2) {
      return NextResponse.json({ 
        books: quickMatches.slice(0, 10),
        source: 'fuzzy'
      })
    }

    // Use LLM for natural language understanding
    const bookList = allBooks.map(b => 
      `- ID:${b.id} | "${b.title}" di ${b.authors[0] || 'N/D'} | ${b.genres.join(', ')} | ${b.status} | ${b.rating ? `⭐${b.rating}` : 'nessun voto'} | ${b.publishedYear || '?'} | ${b.pageCount ? `${b.pageCount}pag` : ''}`
    ).join('\n')

    const prompt = `Sei un sistema di ricerca semantica per una libreria personale. 
    
LIBRERIA DELL'UTENTE:
${bookList}

RICERCA UTENTE: "${query}"

Trova i libri della libreria che corrispondono alla ricerca. La ricerca può essere:
- Un titolo parziale o approssimativo
- Un autore
- Un genere o tema ("libri di fantascienza", "qualcosa di romantico")
- Uno stato di lettura ("cosa sto leggendo", "libri da leggere")
- Un voto o qualità ("i libri migliori", "quelli con 5 stelle")
- Una descrizione vaga ("quel libro su Roma", "il romanzo pesante")
- Qualsiasi combinazione

Rispondi SOLO con un JSON array degli ID dei libri corrispondenti, ordinati per rilevanza:
["id1", "id2", "id3"]

Includi solo ID che compaiono nella libreria. Se nessun libro corrisponde, restituisci [].
Rispondi SOLO con l'array JSON, nient'altro.`

    const result = await callLLM(prompt)

    let matchedIds: string[]
    try {
      const clean = result.content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const match = clean.match(/\[[\s\S]*\]/)
      matchedIds = JSON.parse(match ? match[0] : clean)
      if (!Array.isArray(matchedIds)) throw new Error()
    } catch {
      // Fallback to fuzzy
      matchedIds = quickMatches.slice(0, 10).map(b => b.id)
    }

    // Return the books in the matched order
    const matchedBooks = matchedIds
      .map(id => allBooks.find(b => b.id === id))
      .filter(Boolean)

    // Include quick matches not caught by LLM
    const resultIds = new Set(matchedIds)
    const additionalMatches = quickMatches.filter(b => !resultIds.has(b.id))

    return NextResponse.json({ 
      books: [...matchedBooks, ...additionalMatches].slice(0, 10),
      source: 'nl_search',
      query
    })
  } catch (error) {
    console.error('[ai/search]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
