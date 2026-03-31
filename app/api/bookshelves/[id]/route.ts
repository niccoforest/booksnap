import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Bookshelf } from '@/models/Bookshelf'
import { getAuthUser } from '@/lib/auth'
import mongoose from 'mongoose'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/bookshelves/[id]
export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params
    await connectDB()
    mongoose.models.Book || require('@/models/Book')

    const shelf = await Bookshelf.findById(id)
      .populate('userId', 'username avatar profileSlug')
      .populate('books', 'title authors coverUrl description')
      .lean()

    if (!shelf) return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })
    if (!(shelf as any).isPublic) {
      const auth = await getAuthUser(request)
      if (!auth || auth.userId !== (shelf as any).userId._id?.toString()) {
        return NextResponse.json({ error: 'Lista privata' }, { status: 403 })
      }
    }

    return NextResponse.json({ bookshelf: shelf })
  } catch (error) {
    console.error('[bookshelves get id]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PATCH /api/bookshelves/[id] — add/remove book or update metadata
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id } = await ctx.params
    await connectDB()

    const shelf = await Bookshelf.findOne({ _id: id, userId: authUser.userId })
    if (!shelf) return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })

    const body = await request.json()

    // Update metadata
    if (body.title !== undefined) shelf.title = body.title.trim()
    if (body.description !== undefined) shelf.description = body.description.trim()
    if (body.isPublic !== undefined) shelf.isPublic = body.isPublic

    // Add/remove book
    if (body.addBookId) {
      const bookOid = new mongoose.Types.ObjectId(body.addBookId)
      if (!shelf.books.some((b: mongoose.Types.ObjectId) => b.toString() === body.addBookId)) {
        shelf.books.push(bookOid)
      }
    }
    if (body.removeBookId) {
      shelf.books = shelf.books.filter((b: mongoose.Types.ObjectId) => b.toString() !== body.removeBookId)
    }

    await shelf.save()
    return NextResponse.json({ bookshelf: shelf })
  } catch (error) {
    console.error('[bookshelves patch]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// DELETE /api/bookshelves/[id]
export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id } = await ctx.params
    await connectDB()

    const shelf = await Bookshelf.findOneAndDelete({ _id: id, userId: authUser.userId })
    if (!shelf) return NextResponse.json({ error: 'Lista non trovata' }, { status: 404 })

    return NextResponse.json({ message: 'Lista eliminata' })
  } catch (error) {
    console.error('[bookshelves delete]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
