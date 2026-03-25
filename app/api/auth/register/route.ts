import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { signToken, createAuthCookieHeader } from '@/lib/auth'
import { Library } from '@/models/Library'

export async function POST(request: NextRequest) {
  try {
    const { email, username, password } = await request.json()

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Email, username e password sono obbligatori' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ $or: [{ email }, { username }] })
    if (existing) {
      const field = existing.email === email.toLowerCase() ? 'email' : 'username'
      return NextResponse.json({ error: `Questo ${field} è già in uso` }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ email, username, passwordHash })

    // Create default library
    await Library.create({
      userId: user._id,
      name: 'La mia libreria',
      emoji: '📚',
      isDefault: true,
    })

    const token = signToken({ userId: user._id.toString(), email: user.email })

    const response = NextResponse.json({
      user: { id: user._id, email: user.email, username: user.username },
    }, { status: 201 })

    response.headers.set('Set-Cookie', createAuthCookieHeader(token))
    return response
  } catch (error) {
    console.error('[register]', error)
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 })
  }
}
