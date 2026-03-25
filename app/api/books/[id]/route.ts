import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Book } from '@/models/Book'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/books/[id]'>
) {
  try {
    const { id } = await ctx.params
    await connectDB()
    const book = await Book.findById(id)
    if (!book) return NextResponse.json({ error: 'Libro non trovato' }, { status: 404 })
    return NextResponse.json({ book })
  } catch (error) {
    console.error('[book by id]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
