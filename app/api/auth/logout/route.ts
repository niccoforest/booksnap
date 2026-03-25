import { NextResponse } from 'next/server'
import { clearAuthCookieHeader } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ message: 'Logout effettuato' })
  response.headers.set('Set-Cookie', clearAuthCookieHeader())
  return response
}
