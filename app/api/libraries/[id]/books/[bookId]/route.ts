import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Library, BookEntry } from '@/models/Library'
import mongoose from 'mongoose'

// DELETE /api/libraries/[id]/books/[bookId] - Remove book from library
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/libraries/[id]/books/[bookId]'>
) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id, bookId } = await ctx.params

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(bookId)) {
      return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
    }

    await connectDB()

    const library = await Library.findOne({ _id: id, userId: user.userId })
    if (!library) return NextResponse.json({ error: 'Libreria non trovata' }, { status: 404 })

    const before = library.books.length
    library.books = library.books.filter(
      (b: BookEntry) => b.bookId.toString() !== bookId
    )

    if (library.books.length === before) {
      return NextResponse.json({ error: 'Libro non trovato in questa libreria' }, { status: 404 })
    }

    await library.save()
    return NextResponse.json({ message: 'Libro rimosso' })
  } catch (error) {
    console.error('[library remove book]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
