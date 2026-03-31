import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'
import { searchExternalBooks } from '@/lib/bookMetadata'

// POST /api/books - Create a book manually (no external API lookup)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { title, authors, isbn } = await request.json()

    if (!title?.trim() || !authors?.length) {
      return NextResponse.json({ error: 'Titolo e autore obbligatori' }, { status: 400 })
    }

    await connectDB()

    // Check for duplicates
    const orFilters: any[] = [{ title: title.trim(), 'authors.0': authors[0].trim() }]
    if (isbn?.trim()) orFilters.push({ isbn: isbn.trim() })

    const existing = await Book.findOne({ $or: orFilters })
    if (existing) return NextResponse.json({ book: existing }, { status: 200 })

    const book = await Book.create({
      title: title.trim(),
      authors: authors.map((a: string) => a.trim()).filter(Boolean),
      ...(isbn?.trim() ? { isbn: isbn.trim() } : {}),
    })

    return NextResponse.json({ book }, { status: 201 })
  } catch (error) {
    console.error('[books POST]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const sortBy = searchParams.get('sortBy') || 'relevance'
    const limit = Math.min(parseInt(searchParams.get('limit') || '40'), 100)
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const skip = (page - 1) * limit
    
    // Filters
    const genre = searchParams.get('genre')
    const yearFrom = searchParams.get('yearFrom')
    const yearTo = searchParams.get('yearTo')
    const lang = searchParams.get('lang')
    const pagesMin = searchParams.get('pagesMin')
    const pagesMax = searchParams.get('pagesMax')
    const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1

    await connectDB()

    let baseQuery: any = {}
    if (genre) baseQuery.genres = genre
    if (lang) baseQuery.language = lang
    
    if (yearFrom || yearTo) {
      baseQuery.publishedYear = {}
      if (yearFrom) baseQuery.publishedYear.$gte = parseInt(yearFrom)
      if (yearTo) baseQuery.publishedYear.$lte = parseInt(yearTo)
    }

    if (pagesMin || pagesMax) {
      baseQuery.pageCount = {}
      if (pagesMin) baseQuery.pageCount.$gte = parseInt(pagesMin)
      if (pagesMax) baseQuery.pageCount.$lte = parseInt(pagesMax)
    }

    // Determine sort object
    let sortObj: any = { createdAt: -1 }
    if (sortBy === 'title') sortObj = { title: 1 }
    if (sortBy === 'author') sortObj = { authors: 1 }
    if (sortBy === 'year') sortObj = { publishedYear: -1 }
    if (sortBy === 'pages') sortObj = { pageCount: -1 }
    if (sortBy === 'newest') sortObj = { publishedYear: -1 }

    let books = []

    if (q) {
      // 1. Try text search with base filters
      const finalSort = sortBy === 'relevance' ? { score: { $meta: 'textScore' } } : sortObj
      const textQuery = { ...baseQuery, $text: { $search: q } }
      books = await Book.find(textQuery).sort(finalSort).skip(skip).limit(limit)

      // 2. If no results, try broader regex search
      if (books.length === 0) {
        const regexQuery = { 
          ...baseQuery,
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { authors: { $regex: q, $options: 'i' } }
          ]
        }
        books = await Book.find(regexQuery).sort(sortObj).skip(skip).limit(limit)
      }
    } else {
      // Just filter without term
      books = await Book.find(baseQuery).sort(sortObj).skip(skip).limit(limit)
    }

    // 🏆 Fallback to External Search if sparse results
    if (q && books.length < 3) {
      console.log(`[search API] Trying external search for: "${q}"`)
      const external = await searchExternalBooks(q, 10)
      console.log(`[search API] Got ${external.length} external results`)
      
      const externalUpserted = []
      for (const eb of external) {
        // Skip if already in results
        if (books.some(b => b.isbn === eb.isbn || (b.title === eb.title && b.authors[0] === eb.authors[0]))) continue

        const orFilters = []
        if (eb.isbn) orFilters.push({ isbn: eb.isbn })
        if (eb.title && eb.authors?.[0]) orFilters.push({ title: eb.title, authors: eb.authors[0] })

        let existingInternal = null
        if (orFilters.length > 0) {
          existingInternal = await Book.findOne({ $or: orFilters })
        }

        if (existingInternal) {
          externalUpserted.push(existingInternal)
        } else {
          try {
            const newBook = await Book.create({
              ...eb,
              authors: eb.authors || []
            })
            externalUpserted.push(newBook)
          } catch (e: any) {
             console.error(`[search API] Failed to upsert ${eb.title}:`, e.message)
          }
        }
      }
      
      books = [...books, ...externalUpserted].slice(0, limit)
    }
      
    return NextResponse.json({ books })
  } catch (error) {
    console.error('[books GET]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
