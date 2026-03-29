import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Conversation } from '@/models/Conversation'
import mongoose from 'mongoose'

// [GET] Load messages from a specific conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id } = await params
    if (!id || !mongoose.isValidObjectId(id)) {
      console.error(`[GET /api/assistant/conversations/[id]] Invalid ID received: "${id}"`)
      return NextResponse.json({ error: `ID conversazione non valido: ${id}` }, { status: 400 })
    }

    await connectDB()
    const conversation = await Conversation.findOne({ _id: id, userId: user.userId }).lean()

    if (!conversation) {
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 })
    }

    return NextResponse.json({ 
      messages: conversation.messages, 
      title: conversation.title,
      conversationId: conversation._id.toString() 
    })
  } catch (error) {
    console.error('[GET /api/assistant/conversations/[id]]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// [DELETE] Archive (soft-delete) a conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { id } = await params
    if (!id || !mongoose.isValidObjectId(id)) {
      console.error(`[DELETE /api/assistant/conversations/[id]] Invalid ID received: "${id}"`)
      return NextResponse.json({ error: `ID conversazione non valido: ${id}` }, { status: 400 })
    }

    await connectDB()
    // Soft-delete to allow admin recovery if needed
    const conversation = await Conversation.findOneAndUpdate(
      { _id: id, userId: user.userId },
      { isArchived: true },
      { new: true }
    )

    if (!conversation) {
      return NextResponse.json({ error: 'Conversazione non trovata' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/assistant/conversations/[id]]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
