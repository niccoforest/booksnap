import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { signToken, createAuthCookieHeader } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password sono obbligatori' }, { status: 400 })
    }

    await connectDB()

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    }

    if (!user.passwordHash) {
      return NextResponse.json({ error: "Questo account utilizza Google per l'accesso. Usa il bottone 'Accedi con Google'." }, { status: 400 })
    }

    const valid = await user.comparePassword(password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    }

    const token = signToken({ userId: user._id.toString(), email: user.email })

    const response = NextResponse.json({
      user: { id: user._id, email: user.email, username: user.username, avatar: user.avatar },
    })

    response.headers.set('Set-Cookie', createAuthCookieHeader(token))
    return response
  } catch (error) {
    console.error('[login]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
