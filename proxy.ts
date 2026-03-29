import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PROTECTED_PATHS = ['/library', '/scan', '/search', '/profile']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected =
    PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/book/')

  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('booksnap_token')?.value
  if (!token || !verifyToken(token)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/library/:path*', '/scan/:path*', '/search/:path*', '/profile/:path*', '/book/:path*'],
}
