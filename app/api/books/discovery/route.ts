import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildTasteProfile } from '@/lib/tasteProfile'
import { searchExternalBooks } from '@/lib/bookMetadata'
import { Book } from '@/models/Book'
import { connectDB } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    await connectDB()
    const profile = await buildTasteProfile(auth.userId)
    
    // Top 4 genres, with fallback to popular ones if empty
    let topGenres = profile.genreAffinities.slice(0, 4).map(g => g.genre)
    if (topGenres.length === 0) {
      topGenres = ['Narrativa', 'Thriller', 'Giallo', 'Fantascienza', 'Classici', 'Business']
    }

    // Parallel fetch for each top genre
    const discovery = await Promise.all(
      topGenres.map(async (genre) => {
        // First try local DB to get some variety
        const local = await Book.find({ genres: { $regex: new RegExp(genre, 'i') } }).limit(4).lean()
        
        // Then fetch from Google Books for that genre
        const external = await searchExternalBooks(`subject:${genre}`, 12)
        
        // Combine and deduplicate by ID and Title
        const seenIds = new Set(local.map(b => b._id.toString()))
        const seenTitles = new Set(local.map(b => b.title.toLowerCase()))
        const combined = [...local]
        
        for (const eb of external) {
          if (combined.length >= 10) break
          if (seenTitles.has(eb.title.toLowerCase())) continue

          const existing = await Book.findOne({ 
            $or: [
              ...(eb.isbn ? [{ isbn: eb.isbn }] : []),
              { title: eb.title, authors: eb.authors?.[0] }
            ]
          })

          if (existing) {
            if (!seenIds.has(existing._id.toString())) {
              combined.push(existing)
              seenIds.add(existing._id.toString())
            }
          } else {
            try {
              const newBook = await Book.create({ ...eb })
              combined.push(newBook)
              seenIds.add(newBook._id.toString())
            } catch {}
          }
          seenTitles.add(eb.title.toLowerCase())
        }

        return {
          genre,
          books: combined.slice(0, 8)
        }
      })
    )

    // Also get a "Random Discovery" to keep it fresh
    const randomResults = await searchExternalBooks('new release books 2024', 6)

    return NextResponse.json({
      discovery,
      random: randomResults
    })
  } catch (error) {
    console.error('[discovery API]', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
