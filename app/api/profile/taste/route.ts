import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { buildTasteProfile } from '@/lib/tasteProfile'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const profile = await buildTasteProfile(user.userId)
    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[taste_profile]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
