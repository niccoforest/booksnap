import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Bookshelf } from '@/models/Bookshelf'
import { getAuthUser } from '@/lib/auth'
import mongoose from 'mongoose'

// GET /api/bookshelves — public bookshelves (with optional ?mine=true for own)
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    mongoose.models.Book || require('@/models/Book')
    mongoose.models.User || require('@/models/User')

    const mine = request.nextUrl.searchParams.get('mine')
    const authUser = await getAuthUser(request)

    let query: any = { isPublic: true }
    if (mine === 'true' && authUser) {
      query = { userId: new mongoose.Types.ObjectId(authUser.userId) }
    }

    const bookshelves = await Bookshelf.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'username avatar profileSlug')
      .populate({ path: 'books', select: 'title authors coverUrl', options: { limit: 4 } })
      .lean()

    return NextResponse.json({ bookshelves })
  } catch (error) {
    console.error('[bookshelves get]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST /api/bookshelves — create a new bookshelf
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { title, description, isPublic = true } = await request.json()
    if (!title?.trim()) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })

    await connectDB()

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      + '-' + Math.random().toString(36).substring(2, 6)

    const shelf = await Bookshelf.create({
      userId: new mongoose.Types.ObjectId(authUser.userId),
      title: title.trim(),
      description: description?.trim(),
      isPublic,
      slug,
      books: [],
    })

    return NextResponse.json({ bookshelf: shelf }, { status: 201 })
  } catch (error) {
    console.error('[bookshelves post]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
