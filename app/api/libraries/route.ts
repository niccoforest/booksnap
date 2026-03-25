import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Library } from '@/models/Library'
import mongoose from 'mongoose'

// GET /api/libraries - Get all libraries for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await connectDB()
    const libraries = await Library.find({ userId: user.userId })
      .populate('books.bookId')
      .sort({ isDefault: -1, createdAt: 1 })

    return NextResponse.json({ libraries })
  } catch (error) {
    console.error('[libraries GET]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST /api/libraries - Create a new library
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { name, description, emoji } = await request.json()
    if (!name) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 })

    await connectDB()
    const library = await Library.create({
      userId: user.userId,
      name,
      description,
      emoji: emoji || '📚',
      isDefault: false,
    })

    return NextResponse.json({ library }, { status: 201 })
  } catch (error) {
    console.error('[libraries POST]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
