import { connectDB } from '@/lib/mongodb'
import { Library, BookEntry } from '@/models/Library'
import { Book, IBook } from '@/models/Book'
import { User } from '@/models/User'
import mongoose from 'mongoose'

export interface TasteProfile {
  genreAffinities: Array<{
    genre: string
    score: number
    bookCount: number
    avgRating: number
  }>
  favoriteAuthors: Array<{
    name: string
    bookCount: number
    avgRating: number
  }>
  recentlyCompleted: Array<{
    title: string
    author: string
    rating?: number
    genres: string[]
  }>
  currentlyReading: Array<{
    title: string
    author: string
  }>
  stats: {
    totalBooks: number
    completedBooks: number
    avgRating: number
    preferredPageRange: string
    topGenres: string[]
  }
}

export async function buildTasteProfile(userId: string): Promise<TasteProfile> {
  await connectDB()

  // Ensure models are registered (sometimes Book is not registered depending on entry point)
  mongoose.models.Book || mongoose.model('Book', Book.schema)
  mongoose.models.User || mongoose.model('User', User.schema)

  const libraries = await Library.find({ userId: new mongoose.Types.ObjectId(userId) }).populate({
    path: 'books.bookId',
    model: Book
  })

  // Get User overrides
  const user = await User.findById(userId)
  const genreOverrides = user?.preferences?.genreOverrides || new Map<string, string>()

  const allBooks: Array<{ entry: BookEntry, book: IBook }> = []
  
  libraries.forEach(lib => {
    lib.books.forEach((entry: BookEntry) => {
      if (entry.bookId && (entry.bookId as unknown as IBook).title) {
         allBooks.push({ entry, book: entry.bookId as unknown as IBook })
      }
    })
  })

  // Group by genre
  const genreStats = new Map<string, { weightSum: number, count: number, ratingSum: number, ratedCount: number }>()

  // Group by author
  const authorStats = new Map<string, { count: number, ratingSum: number, ratedCount: number }>()

  // Stats
  let totalBooks = allBooks.length
  let completedBooks = 0
  let totalRatingSum = 0
  let totalRatedCount = 0
  const pageCounts: number[] = []

  // Lists
  let completedList: Array<{ entry: BookEntry, book: IBook }> = []
  let readingList: Array<{ entry: BookEntry, book: IBook }> = []

  const now = new Date()

  allBooks.forEach(({ entry, book }) => {
    if (entry.status === 'completed') {
       completedBooks++
       completedList.push({ entry, book })
    } else if (entry.status === 'reading') {
       readingList.push({ entry, book })
    }

    if (entry.rating) {
      totalRatingSum += entry.rating
      totalRatedCount++
    }

    if (book.pageCount) {
      pageCounts.push(book.pageCount)
    }

    // Process Author
    book.authors.forEach(author => {
      if (!author) return
      if (!authorStats.has(author)) {
         authorStats.set(author, { count: 0, ratingSum: 0, ratedCount: 0 })
      }
      const a = authorStats.get(author)!
      a.count++
      if (entry.rating) {
        a.ratingSum += entry.rating
        a.ratedCount++
      }
    })

    // Weights calculation per TP-1 logic
    let entryWeight = 1.0 // default

    if (entry.status === 'completed') {
      if (entry.rating === 5) entryWeight = 3.0
      else if (entry.rating === 4) entryWeight = 2.5
      else if (entry.rating === 3) entryWeight = 1.5
      else entryWeight = 1.5
    } else if (entry.status === 'reading') {
      entryWeight = 2.0
    } else if (entry.status === 'to_read') {
      entryWeight = 1.0
    } else if (entry.status === 'abandoned') {
      entryWeight = 0.3
    } else if (entry.status === 'lent') {
      entryWeight = 1.5
    }

    // Recency bonus: last 3 months
    const dateToCheck = entry.finishedAt || entry.startedAt || entry.addedAt
    if (dateToCheck) {
      const diffTime = Math.abs(now.getTime() - dateToCheck.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays <= 90) {
        entryWeight *= 1.5
      }
    }

    // Process Genres
    book.genres.forEach(g => {
      const genre = g.trim()
      if (!genre) return

      if (!genreStats.has(genre)) {
         genreStats.set(genre, { weightSum: 0, count: 0, ratingSum: 0, ratedCount: 0 })
      }
      const gStat = genreStats.get(genre)!
      gStat.count++
      gStat.weightSum += entryWeight
      if (entry.rating) {
        gStat.ratingSum += entry.rating
        gStat.ratedCount++
      }
    })
  })

  // Normalize Genre Scores
  let maxWeight = 0
  const genreAffinitiesRaw: Array<{ genre: string, score: number, bookCount: number, avgRating: number }> = []

  for (const [genre, stat] of genreStats.entries()) {
    let finalWeight = stat.weightSum
    
    // Apply user overrides (PR-2 logic)
    if (genreOverrides.has(genre)) {
      const override = genreOverrides.get(genre)
      if (override === 'boost') finalWeight *= 2.0
      else if (override === 'suppress') finalWeight *= 0.1
    }

    if (finalWeight > maxWeight) maxWeight = finalWeight
    
    genreAffinitiesRaw.push({
      genre,
      score: finalWeight, // raw weight for now
      bookCount: stat.count,
      avgRating: stat.ratedCount > 0 ? (stat.ratingSum / stat.ratedCount) : 0
    })
  }

  // Normalize to 0-100
  const genreAffinities = genreAffinitiesRaw.map(g => ({
    ...g,
    score: maxWeight > 0 ? Math.round((g.score / maxWeight) * 100) : 0
  })).sort((a, b) => b.score - a.score)

  // Favorite Authors (rating >= 4 or books >= 4)
  const favoriteAuthors = Array.from(authorStats.entries()).map(([name, stat]) => ({
    name,
    bookCount: stat.count,
    avgRating: stat.ratedCount > 0 ? (stat.ratingSum / stat.ratedCount) : 0
  })).filter(a => a.avgRating >= 4 || a.bookCount >= 4)
  .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))

  // Recently completed (last 5)
  completedList.sort((a, b) => {
    const d1 = a.entry.finishedAt || a.entry.addedAt || new Date(0)
    const d2 = b.entry.finishedAt || b.entry.addedAt || new Date(0)
    return d2.getTime() - d1.getTime()
  })

  const recentlyCompleted = completedList.slice(0, 5).map(c => ({
    title: c.book.title,
    author: c.book.authors[0] || 'Sconosciuto',
    rating: c.entry.rating,
    genres: c.book.genres
  }))

  const currentlyReading = readingList.map(r => ({
    title: r.book.title,
    author: r.book.authors[0] || 'Sconosciuto'
  }))

  // Preferred Page Range
  let preferredPageRange = 'N/A'
  if (pageCounts.length > 0) {
    const avgPages = pageCounts.reduce((a, b) => a + b, 0) / pageCounts.length
    if (avgPages < 200) preferredPageRange = '< 200 pagine'
    else if (avgPages <= 400) preferredPageRange = '200-400 pagine'
    else if (avgPages <= 600) preferredPageRange = '400-600 pagine'
    else preferredPageRange = '> 600 pagine'
  }

  const topGenres = genreAffinities.slice(0, 3).map(g => g.genre)

  return {
    genreAffinities,
    favoriteAuthors,
    recentlyCompleted,
    currentlyReading,
    stats: {
      totalBooks,
      completedBooks,
      avgRating: totalRatedCount > 0 ? parseFloat((totalRatingSum / totalRatedCount).toFixed(1)) : 0,
      preferredPageRange,
      topGenres
    }
  }
}
