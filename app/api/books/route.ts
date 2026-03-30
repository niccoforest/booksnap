import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'
import { searchExternalBooks } from '@/lib/bookMetadata'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '40'), 100)
    
    // Filters
    const genre = searchParams.get('genre')
    const yearFrom = searchParams.get('yearFrom')
    const yearTo = searchParams.get('yearTo')
    const lang = searchParams.get('lang')
    const pagesMin = searchParams.get('pagesMin')
    const pagesMax = searchParams.get('pagesMax')

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

    let books = []

    if (q) {
      // 1. Try text search with base filters
      const textQuery = { ...baseQuery, $text: { $search: q } }
      books = await Book.find(textQuery).limit(limit).sort({ score: { $meta: 'textScore' } })

      // 2. If no results, try broader regex search (basic typo tolerance / partial match)
      if (books.length === 0) {
        const regexQuery = { 
          ...baseQuery,
          $or: [
            { title: { $regex: q, $options: 'i' } },
            { authors: { $regex: q, $options: 'i' } }
          ]
        }
        books = await Book.find(regexQuery).limit(limit).sort({ createdAt: -1 })
      }
    } else {
      // Just filter without term
      books = await Book.find(baseQuery).limit(limit).sort({ createdAt: -1 })
    }

    // 🏆 Fallback to External Search if sparse results
    if (q && books.length < 3) {
      const external = await searchExternalBooks(q, 10)
      
      const externalUpserted = []
      for (const eb of external) {
        // Skip if we already have it in current results (basic check)
        if (books.some(b => b.isbn === eb.isbn || (b.title === eb.title && b.authors[0] === eb.authors[0]))) continue

        // Upsert to internal Book collection so detail page works
        const existingInternal = await Book.findOne({ 
           $or: [
             { isbn: eb.isbn },
             { title: eb.title, authors: eb.authors?.[0] }
           ]
        })

        if (existingInternal) {
          externalUpserted.push(existingInternal)
        } else {
          try {
            const newBook = await Book.create({
              ...eb,
              authors: eb.authors || []
            })
            externalUpserted.push(newBook)
          } catch {}
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
