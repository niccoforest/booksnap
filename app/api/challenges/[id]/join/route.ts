import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Challenge } from '@/models/Challenge'
import { getAuthUser } from '@/lib/auth'
import mongoose from 'mongoose'

type Ctx = { params: Promise<{ id: string }> }

// POST /api/challenges/[id]/join — join or leave a challenge
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id } = await ctx.params
    await connectDB()

    const challenge = await Challenge.findById(id)
    if (!challenge) return NextResponse.json({ error: 'Sfida non trovata' }, { status: 404 })
    if (new Date() > challenge.endDate) {
      return NextResponse.json({ error: 'Sfida scaduta' }, { status: 400 })
    }

    const userOid = new mongoose.Types.ObjectId(authUser.userId)
    const idx = challenge.participants.findIndex((p: { userId: mongoose.Types.ObjectId }) => p.userId.toString() === authUser.userId)

    if (idx >= 0) {
      // Leave
      challenge.participants.splice(idx, 1)
      await challenge.save()
      return NextResponse.json({ isJoined: false, participantCount: challenge.participants.length })
    } else {
      // Join
      challenge.participants.push({ userId: userOid, progress: 0, joinedAt: new Date() })
      await challenge.save()
      return NextResponse.json({ isJoined: true, participantCount: challenge.participants.length })
    }
  } catch (error) {
    console.error('[challenge join]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
