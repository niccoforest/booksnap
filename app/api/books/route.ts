import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'

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

    let query: any = {}
    if (q) {
      query.$text = { $search: q }
    }
    
    if (genre) query.genres = genre
    if (lang) query.language = lang
    
    if (yearFrom || yearTo) {
      query.publishedYear = {}
      if (yearFrom) query.publishedYear.$gte = parseInt(yearFrom)
      if (yearTo) query.publishedYear.$lte = parseInt(yearTo)
    }

    if (pagesMin || pagesMax) {
      query.pageCount = {}
      if (pagesMin) query.pageCount.$gte = parseInt(pagesMin)
      if (pagesMax) query.pageCount.$lte = parseInt(pagesMax)
    }

    const books = await Book.find(query)
      .limit(limit)
      .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      
    // Average rating cannot be easily filtered here without aggregation, so we omit for now
    return NextResponse.json({ books })
  } catch (error) {
    console.error('[books GET]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
