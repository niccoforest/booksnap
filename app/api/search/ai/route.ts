import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { callLLM } from '@/lib/llm'
import { Book } from '@/models/Book'
import { User } from '@/models/User'
import { enrichBookMetadata } from '@/lib/bookMetadata'

interface ParsedSearchParams {
  title?: string
  author?: string
  genres?: string[]
  keywords?: string[]
  yearFrom?: number
  yearTo?: number
  language?: string
  pageRange?: 'short' | 'medium' | 'long'
  intent?: 'specific' | 'discovery' | 'similar'
}

const SEARCH_PARSER_PROMPT = `Sei un parser di query di ricerca libri. Data la query dell'utente, estrai parametri strutturati.
Rispondi SOLO con JSON valido, senza markdown, senza spiegazioni.

Parametri possibili:
- title: stringa (se l'utente cerca un titolo specifico)
- author: stringa (se l'utente cerca un autore specifico)
- genres: string[] (generi letterari rilevanti, in italiano)
- keywords: string[] (parole chiave tematiche per la descrizione)
- yearFrom: number (anno minimo pubblicazione)
- yearTo: number (anno massimo pubblicazione)
- language: string (codice lingua: "it", "en", etc.)
- pageRange: "short" (<200) | "medium" (200-400) | "long" (>400)
- intent: "specific" | "discovery" | "similar"

Esempi:
Query: "un giallo nordico recente"
→ {"genres":["Giallo","Thriller"],"keywords":["nordico","scandinavo"],"yearFrom":2020,"intent":"discovery"}

Query: "libri come Il nome della rosa"
→ {"title":"Il nome della rosa","genres":["Storico","Giallo"],"intent":"similar"}

Query: "romanzi brevi di Calvino"
→ {"author":"Italo Calvino","pageRange":"short","intent":"specific"}

Query: "fantasy epico con worldbuilding complesso"
→ {"genres":["Fantasy"],"keywords":["epico","worldbuilding","complesso"],"intent":"discovery"}

Query: "romanzo ambientato in Giappone anni 80"
→ {"keywords":["Giappone"],"yearFrom":1980,"yearTo":1989,"intent":"discovery"}`

function buildMongoQuery(params: ParsedSearchParams) {
  const query: Record<string, unknown> = {}

  if (params.title) {
    query.title = { $regex: params.title, $options: 'i' }
  }
  if (params.author) {
    query.authors = { $elemMatch: { $regex: params.author, $options: 'i' } }
  }
  if (params.genres?.length) {
    query.genres = { $in: params.genres.map(g => new RegExp(g, 'i')) }
  }
  if (params.keywords?.length) {
    query.description = { $regex: params.keywords.join('|'), $options: 'i' }
  }
  if (params.yearFrom || params.yearTo) {
    const yearQuery: Record<string, number> = {}
    if (params.yearFrom) yearQuery.$gte = params.yearFrom
    if (params.yearTo) yearQuery.$lte = params.yearTo
    query.publishedYear = yearQuery
  }
  if (params.language) {
    query.language = params.language
  }
  if (params.pageRange) {
    const ranges = {
      short: { $lt: 200 },
      medium: { $gte: 200, $lte: 400 },
      long: { $gt: 400 }
    }
    query.pageCount = ranges[params.pageRange]
  }

  return query
}

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { query } = await request.json()
  if (!query?.trim()) return NextResponse.json({ error: 'Query mancante' }, { status: 400 })

  await connectDB()

  // Step 1: LLM parses the query into structured params
  let parsedParams: ParsedSearchParams = { intent: 'discovery' }
  try {
    const raw = await callLLM(`${SEARCH_PARSER_PROMPT}\n\nQuery utente: "${query.trim()}"`)
    const cleaned = raw.replace(/```json|```/g, '').trim()
    parsedParams = JSON.parse(cleaned)
  } catch {
    // Fallback: treat as keyword search
    parsedParams = { keywords: [query.trim()], intent: 'discovery' }
  }

  // Step 2: Query MongoDB with structured params
  const mongoQuery = buildMongoQuery(parsedParams)
  let books = await Book.find(mongoQuery).limit(20).lean()

  let fromAI = false

  // Step 3: LLM fallback if < 5 results and intent is discovery/similar
  if (books.length < 5 && parsedParams.intent !== 'specific') {
    fromAI = true
    try {
      const fallbackPrompt = `Sei un esperto libraio. L'utente cerca: "${query}".
Suggerisci 5 libri che corrispondono a questa ricerca.
Per ogni libro fornisci: title, author (primo autore), year (anno pubblicazione approssimativo).
Rispondi SOLO con JSON array, senza markdown.
Esempio: [{"title":"Nome libro","author":"Nome Autore","year":2015}]`

      const raw = await callLLM(fallbackPrompt)
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const suggestions: Array<{ title: string; author: string; year?: number }> = JSON.parse(cleaned)

      // Enrich with metadata (covers, genres, etc.)
      const enriched = await Promise.all(
        suggestions.slice(0, 5).map(async (s) => {
          try {
            const meta = await enrichBookMetadata({
              title: s.title,
              authors: [s.author],
              genres: parsedParams.genres || [],
              description: '',
              coverUrl: '',
              publishedYear: s.year,
            } as any)
            return meta
          } catch {
            return null
          }
        })
      )

      const validEnriched = enriched.filter(Boolean)
      // Merge DB results with AI suggestions (deduplicate by title)
      const existingTitles = new Set(books.map((b: any) => b.title.toLowerCase()))
      const newBooks = validEnriched.filter(
        (b: any) => b && !existingTitles.has(b.title?.toLowerCase())
      )
      books = [...books, ...newBooks] as any[]
    } catch {
      // Fallback silenzioso — restituisce i risultati DB anche se pochi
    }
  }

  // Track usage
  User.updateOne({ _id: authUser.userId }, { $inc: { 'usageStats.aiQueries': 1 } }).catch(() => {})

  return NextResponse.json({
    books,
    fromAI,
    parsedParams,
  })
}
