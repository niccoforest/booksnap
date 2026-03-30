import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Challenge } from '@/models/Challenge'
import { getAuthUser } from '@/lib/auth'
import mongoose from 'mongoose'

// GET /api/challenges — active public challenges + own challenges
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    mongoose.models.User || require('@/models/User')

    const authUser = await getAuthUser(request)
    const now = new Date()

    const challenges = await Challenge.find({
      $or: [
        { isPublic: true, endDate: { $gte: now } },
        ...(authUser ? [{ createdBy: new mongoose.Types.ObjectId(authUser.userId) }] : []),
      ],
    })
      .sort({ endDate: 1 })
      .limit(20)
      .populate('createdBy', 'username avatar profileSlug')
      .lean()

    // Inject isJoined and own progress for auth user
    const enriched = challenges.map((c: any) => ({
      ...c,
      participantCount: c.participants.length,
      isJoined: authUser
        ? c.participants.some((p: any) => p.userId.toString() === authUser.userId)
        : false,
      ownProgress: authUser
        ? c.participants.find((p: any) => p.userId.toString() === authUser.userId)?.progress ?? 0
        : 0,
      participants: undefined, // don't expose full list
    }))

    return NextResponse.json({ challenges: enriched })
  } catch (error) {
    console.error('[challenges get]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST /api/challenges — create a challenge
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { title, description, type, goal, genre, startDate, endDate, isPublic = true } = await request.json()

    if (!title?.trim()) return NextResponse.json({ error: 'Titolo obbligatorio' }, { status: 400 })
    if (!type || !['book_count', 'genre', 'pages'].includes(type)) {
      return NextResponse.json({ error: 'Tipo non valido' }, { status: 400 })
    }
    if (!goal || goal < 1) return NextResponse.json({ error: 'Obiettivo non valido' }, { status: 400 })
    if (!startDate || !endDate) return NextResponse.json({ error: 'Date obbligatorie' }, { status: 400 })
    if (type === 'genre' && !genre) return NextResponse.json({ error: 'Genere obbligatorio per questa sfida' }, { status: 400 })

    await connectDB()

    const challenge = await Challenge.create({
      createdBy: new mongoose.Types.ObjectId(authUser.userId),
      title: title.trim(),
      description: description?.trim(),
      type,
      goal,
      genre,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isPublic,
      participants: [],
    })

    return NextResponse.json({ challenge }, { status: 201 })
  } catch (error) {
    console.error('[challenges post]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
