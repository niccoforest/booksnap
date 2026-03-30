import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { Notification } from '@/models/Notification'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { subscription } = await request.json()
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Sottoscrizione invalida' }, { status: 400 })
    }

    await connectDB()

    // Upcert notification subscription
    await Notification.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        userId: user.userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        active: true
      },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notifications POST]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { endpoint } = await request.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint richiesto' }, { status: 400 })
    }

    await connectDB()
    await Notification.findOneAndDelete({ endpoint, userId: user.userId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[notifications DELETE]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
