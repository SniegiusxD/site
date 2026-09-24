import { describe, expect, it } from 'vitest'

import { clientFingerprint, rateLimitResponse } from '@/lib/rate-limit'

describe('shared rate limiting', () => {
  it('hashes the client address instead of storing raw IP data', () => {
    const request = new Request('https://example.com/api/auth/sign-in', {
      headers: { 'x-forwarded-for': '203.0.113.4, 10.0.0.2' },
    })
    const fingerprint = clientFingerprint(request, 'test-secret')

    expect(fingerprint).toHaveLength(64)
    expect(fingerprint).not.toContain('203.0.113.4')
  })

  it('returns a bounded 429 response with retry metadata', async () => {
    const response = await rateLimitResponse(
      new Request('https://example.com/api/live'),
      'expensive-read',
      async () => ({ success: false, limit: 20, remaining: 0, reset: 2_000 }),
      1_000,
    )

    expect(response?.status).toBe(429)
    expect(response?.headers.get('retry-after')).toBe('1')
    expect(response?.headers.get('x-ratelimit-limit')).toBe('20')
  })

  it('allows a request when the shared store accepts it', async () => {
    const response = await rateLimitResponse(
      new Request('https://example.com/api/live'),
      'expensive-read',
      async () => ({ success: true, limit: 20, remaining: 19, reset: 2_000 }),
    )

    expect(response).toBeNull()
  })
})

describe('upstashCredentials', () => {
  it('reads the Vercel Marketplace names when the Upstash names are absent', async () => {
    const { upstashCredentials } = await import('@/lib/rate-limit')
    expect(upstashCredentials({ KV_REST_API_URL: 'https://kv.example', KV_REST_API_TOKEN: 't' })).toEqual({ url: 'https://kv.example', token: 't' })
  })

  it('prefers the Upstash names and needs both halves', async () => {
    const { upstashCredentials } = await import('@/lib/rate-limit')
    expect(upstashCredentials({ UPSTASH_REDIS_REST_URL: 'https://u', UPSTASH_REDIS_REST_TOKEN: 'a', KV_REST_API_URL: 'https://kv', KV_REST_API_TOKEN: 'b' })).toEqual({ url: 'https://u', token: 'a' })
    expect(upstashCredentials({ KV_REST_API_URL: 'https://kv' })).toBeNull()
  })
})

describe('per-account limiting', () => {
  it('keys by a hash of the email, case and spaces ignored, never the email itself', async () => {
    const { accountSubject } = await import('@/lib/rate-limit')
    const a = accountSubject('Jonas@Example.lt ', 's')
    expect(a).toBe(accountSubject('jonas@example.lt', 's'))
    expect(a).not.toContain('jonas')
    expect(a.startsWith('acct-')).toBe(true)
  })

  it('counts a subject instead of the client address when one is given', async () => {
    const seen: string[] = []
    await rateLimitResponse(
      new Request('https://example.com/api/auth/sign-in/email', { headers: { 'x-forwarded-for': '1.2.3.4' } }),
      'auth-account',
      async (key) => {
        seen.push(key)
        return { success: true, limit: 8, remaining: 7, reset: 2_000 }
      },
      1_000,
      'acct-abc',
    )
    expect(seen).toEqual(['acct-abc:/api/auth/sign-in/email'])
  })
})
