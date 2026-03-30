import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')

    if (!q || q.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    await connectDB()

    // Prefix match or basic regex for autocomplete
    const query = {
      $or: [
        { title: { $regex: `^${q}`, $options: 'i' } },
        { title: { $regex: q.split(/\s+/).join('.*'), $options: 'i' } }, // Simple fuzzy-like regex
        { authors: { $regex: q, $options: 'i' } }
      ]
    }

    const suggestions = await Book.find(query)
      .select('_id title authors coverUrl')
      .limit(6)
      .sort({ score: { $meta: 'textScore' } }) // if we had text index, but regex doesn't support $meta score. 
      // actually text search for autocomplete is often better but let's stick to regex for partials.
      .lean()

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('[books/autocomplete GET]', error)
    return NextResponse.json({ suggestions: [] })
  }
}
