import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Conversation } from '@/models/Conversation'

// [GET] List all conversations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await connectDB()
    const conversations = await Conversation.find({ userId: user.userId, isArchived: false })
      .sort({ updatedAt: -1 })
      .select('_id title lastMessageAt updatedAt')
      .lean()

    const formatted = conversations.map((c: any) => ({
      ...c,
      _id: c._id.toString()
    }))

    return NextResponse.json({ conversations: formatted })
  } catch (error) {
    console.error('[GET /api/assistant/conversations]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
