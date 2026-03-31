import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Library, BookEntry } from '@/models/Library'
import { logActivity } from '@/lib/activities'
import mongoose from 'mongoose'

// POST /api/libraries/[id]/books - Add book to library
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/libraries/[id]/books'>
) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id } = await ctx.params
    const { bookId, status = 'to_read', readInPast = false, location, behindRow } = await request.json()

    if (!bookId) return NextResponse.json({ error: 'bookId obbligatorio' }, { status: 400 })

    await connectDB()

    const library = await Library.findOne({ _id: id, userId: user.userId })
    if (!library) return NextResponse.json({ error: 'Libreria non trovata' }, { status: 404 })

    // Check if book already exists
    const existing = library.books.find((b: BookEntry) => b.bookId.toString() === bookId)
    if (existing) return NextResponse.json({ error: 'Libro già presente in questa libreria' }, { status: 409 })

    const now = new Date()
    const entry: any = {
      bookId: new mongoose.Types.ObjectId(bookId),
      status,
      tags: [],
      addedAt: now,
      readInPast,
      ...(location !== undefined && { location }),
      ...(behindRow !== undefined && { behindRow }),
    }

    if (status === 'reading') entry.startedAt = now
    if (status === 'completed') {
      entry.startedAt = entry.startedAt || now
      entry.finishedAt = now
    }

    library.books.push(entry)
    await library.save()

    // Activity log - only log if NOT read in past (to keep feed clean of old stuff)
    if (!readInPast) {
      await logActivity(user.userId, 'book_added', bookId)
    }

    return NextResponse.json({ message: 'Libro aggiunto', library: library.toObject() }, { status: 201 })
  } catch (error) {
    console.error('[library add book]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PATCH /api/libraries/[id]/books - Update book entry (status, rating, review, tags)
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/libraries/[id]/books'>
) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id } = await ctx.params
    const { bookId, ...updates } = await request.json()

    await connectDB()

    const library = await Library.findOne({ _id: id, userId: user.userId })
    if (!library) return NextResponse.json({ error: 'Libreria non trovata' }, { status: 404 })

    const entry = library.books.find((b: BookEntry) => b.bookId.toString() === bookId)
    if (!entry) return NextResponse.json({ error: 'Libro non trovato in questa libreria' }, { status: 404 })

    const oldStatus = entry.status
    const oldRating = entry.rating
    const allowedFields = ['status', 'rating', 'review', 'tags', 'startedAt', 'finishedAt', 'lentTo', 'notes', 'readInPast', 'liked', 'favorite', 'location', 'behindRow']
    const now = new Date()

    allowedFields.forEach((field) => {
      if (updates[field] !== undefined) {
        (entry as any)[field] = updates[field]
      }
    })

    // Automatic date handling
    if (updates.status === 'reading' && !entry.startedAt) {
      entry.startedAt = now
    }
    if (updates.status === 'completed' && !entry.finishedAt) {
      entry.finishedAt = now
      if (!entry.startedAt) entry.startedAt = now
    }

    await library.save()

    // Activity logs
    if (updates.status === 'completed' && oldStatus !== 'completed' && !entry.readInPast) {
      await logActivity(user.userId, 'book_finished', bookId)
    }
    if (updates.rating !== undefined && updates.rating !== oldRating) {
      await logActivity(user.userId, 'book_rated', bookId, { rating: updates.rating })
    }

    return NextResponse.json({ message: 'Aggiornato', entry })
  } catch (error) {
    console.error('[library update book]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
