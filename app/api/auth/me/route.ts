import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await connectDB()
    const dbUser = await User.findById(user.userId).select('-passwordHash')
    if (!dbUser) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error('[auth me]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
