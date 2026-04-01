import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { genre, type } = await request.json()
    if (!genre) return NextResponse.json({ error: 'Genere mancante' }, { status: 400 })

    await connectDB()
    const user = await User.findById(auth.userId)
    if (!user) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

    if (!user.preferences) {
      user.preferences = { favoriteGenres: [], language: 'it', theme: 'dark' }
    }
    
    if (!user.preferences.genreOverrides) {
      user.preferences.genreOverrides = new Map()
    }

    const current = user.preferences.genreOverrides.get(genre)
    if (type === null || current === type) {
      // Toggle off: remove the override
      user.preferences.genreOverrides.delete(genre)
    } else {
      user.preferences.genreOverrides.set(genre, type)
    }

    user.markModified('preferences.genreOverrides')
    await user.save()
    return NextResponse.json({ success: true, overrides: Object.fromEntries(user.preferences.genreOverrides) })
  } catch (error) {
    console.error('[overrides POST]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
