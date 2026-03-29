import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

// PATCH /api/auth/me — update preferences (theme)
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { theme } = await request.json()
    if (!['dark', 'light'].includes(theme)) {
      return NextResponse.json({ error: 'Tema non valido' }, { status: 400 })
    }

    await connectDB()
    await User.findByIdAndUpdate(user.userId, { 'preferences.theme': theme })

    return NextResponse.json({ message: 'Preferenze aggiornate' })
  } catch (error) {
    console.error('[auth me patch]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

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
