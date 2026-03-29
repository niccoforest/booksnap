import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { ScanHistory } from '@/models/ScanHistory'

// GET /api/scan/history — ultimi 50 scan dell'utente
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await connectDB()
    const history = await ScanHistory.find({ userId: user.userId })
      .sort({ scannedAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({ history })
  } catch (error) {
    console.error('[scan/history GET]', error)
    return NextResponse.json({ error: 'Errore nel recupero della cronologia' }, { status: 500 })
  }
}

// DELETE /api/scan/history — cancella tutta la cronologia dell'utente
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await connectDB()
    await ScanHistory.deleteMany({ userId: user.userId })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[scan/history DELETE]', error)
    return NextResponse.json({ error: 'Errore nella cancellazione' }, { status: 500 })
  }
}
