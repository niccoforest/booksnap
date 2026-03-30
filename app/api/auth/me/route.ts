import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'

// PATCH /api/auth/me — update user info
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const updates = await request.json()
    await connectDB()

    const allowed = ['bio', 'avatar', 'isPublic', 'theme']
    const finalUpdates: any = {}
    
    if (updates.theme && ['dark', 'light'].includes(updates.theme)) {
      finalUpdates['preferences.theme'] = updates.theme
    }

    allowed.forEach(field => {
      if (updates[field] !== undefined && field !== 'theme') {
        finalUpdates[field] = updates[field]
      }
    })

    const dbUser = await User.findByIdAndUpdate(auth.userId, { $set: finalUpdates }, { new: true })
    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error('[auth me patch]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// GET /api/auth/me
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    await connectDB()
    let dbUser = await User.findById(auth.userId).select('-passwordHash')
    if (!dbUser) return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })

    // Auto-fix for Phase 6 Social (profileSlug)
    if (!dbUser.profileSlug) {
      const slug = dbUser.username.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 5)
      dbUser.profileSlug = slug
      await dbUser.save()
    }

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error('[auth me]', error)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
