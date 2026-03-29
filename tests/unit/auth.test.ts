import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signToken, verifyToken, JWTPayload, createAuthCookieHeader } from '@/lib/auth'

describe('Auth Library', () => {
  const payload: JWTPayload = { userId: '123', email: 'test@example.com' }

  it('should sign and verify a token', () => {
    const token = signToken(payload)
    expect(token).toBeDefined()
    
    const verified = verifyToken(token)
    expect(verified).toMatchObject(payload)
  })

  it('should return null for invalid token', () => {
    const verified = verifyToken('invalid-token')
    expect(verified).toBeNull()
  })

  it('should create auth cookie header', () => {
    const token = 'sample-token'
    const header = createAuthCookieHeader(token)
    expect(header).toContain('booksnap_token=sample-token')
    expect(header).toContain('HttpOnly')
  })
})
