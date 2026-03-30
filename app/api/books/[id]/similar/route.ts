import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params
    await connectDB()

    const book = await Book.findById(id)
    if (!book) return NextResponse.json({ error: 'Libro non trovato' }, { status: 404 })

    // Find similar books by genres or author
    const similar = await Book.find({
      _id: { $ne: id }, // Exclude current book
      $or: [
        { genres: { $in: book.genres || [] } },
        { authors: { $in: book.authors || [] } }
      ]
    })
      .limit(10)
      .lean()

    // Simple scoring by number of shared genres
    const scored = similar.map((b) => {
      let score = 0
      // Same author bonus
      if (b.authors?.some((a: string) => book.authors.includes(a))) score += 5
      
      // Common genres bonus
      const commonGenres = b.genres?.filter((g: string) => book.genres.includes(g)) || []
      score += commonGenres.length * 2

      return { ...b, similarityScore: score }
    })

    // Sort by score and take top 6
    const results = scored
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 6)

    return NextResponse.json({ books: results })
  } catch (error) {
    console.error('[book similar]', error)
    return NextResponse.json({ books: [] })
  }
}
