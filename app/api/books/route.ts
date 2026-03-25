import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    await connectDB()

    let query: any = {}
    if (q) {
      query = { $text: { $search: q } }
    }

    const books = await Book.find(query).limit(limit).sort({ createdAt: -1 })
    return NextResponse.json({ books })
  } catch (error) {
    console.error('[books GET]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
