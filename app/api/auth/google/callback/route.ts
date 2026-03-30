import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { User } from '@/models/User'
import { Library } from '@/models/Library'
import { signToken, createAuthCookieHeader } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const cookieStore = await cookies()
  const storedState = cookieStore.get('oauth_state')?.value
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  baseUrl = baseUrl.replace(/\/$/, '')
  
  console.log('[OAuth Callback] Code:', !!code, 'State:', state, 'StoredState:', storedState)

  if (!code || !state || state !== storedState) {
    console.error('[OAuth Callback] Validation failed:', { codeFromUrl: !!code, stateFromUrl: state, stateFromCookie: storedState })
    const errorResponse = NextResponse.redirect(`${baseUrl}/login?error=google_failed`)
    errorResponse.headers.append('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0; HttpOnly')
    return errorResponse
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const data = await tokenRes.json()
    if (!tokenRes.ok) {
      console.error('Google token exchange error', data)
      throw new Error('Failed to exchange token')
    }

    const { id_token } = data

    // Decode id_token (JWT) directly
    const payloadBuffer = Buffer.from(id_token.split('.')[1], 'base64')
    const payloadStr = payloadBuffer.toString('utf-8')
    const payload = JSON.parse(payloadStr)

    const { email, name, picture, sub: googleId } = payload

    await connectDB()

    let user = await User.findOne({ googleId })

    if (!user) {
      // Look for existing user by email
      user = await User.findOne({ email: email.toLowerCase() })

      if (user) {
        // Link Google Account
        user.googleId = googleId
        if (user.authProvider === 'local') {
            user.authProvider = 'both'
        }
        if (!user.avatarCustomized && picture) {
          user.avatar = picture
        }
        await user.save()
      } else {
        // Create new Account
        // Keep generating unique username if already exists
        let uniqueUsername = name.replace(/\s+/g, '_').toLowerCase()
        let usernameExists = await User.findOne({ username: uniqueUsername })
        let counter = 1
        while (usernameExists) {
          const tryUsername = `${uniqueUsername}_${counter}`
          usernameExists = await User.findOne({ username: tryUsername })
          if (!usernameExists) {
            uniqueUsername = tryUsername
          }
          counter++
        }

        user = await User.create({
          email: email.toLowerCase(),
          username: uniqueUsername,
          googleId,
          authProvider: 'google',
          avatar: picture,
          avatarCustomized: false
        })

        // Create default library
        await Library.create({
          userId: user._id,
          name: 'La Mia Libreria',
          isDefault: true,
          books: []
        })
      }
    } else {
       // update avatar if not customized
       if (!user.avatarCustomized && picture && user.avatar !== picture) {
           user.avatar = picture;
           await user.save();
       }
    }

    // Login directly
    const token = signToken({ userId: user._id.toString(), email: user.email })
    
    // Redirect to library with cookie
    const response = NextResponse.redirect(`${baseUrl}/library`)
    response.headers.append('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0; HttpOnly')
    response.headers.append('Set-Cookie', createAuthCookieHeader(token))
    
    return response

  } catch (error) {
    console.error('Google Auth callback error:', error)
    const errResp = NextResponse.redirect(`${baseUrl}/login?error=google_failed`)
    errResp.headers.append('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0; HttpOnly')
    return errResp
  }
}
