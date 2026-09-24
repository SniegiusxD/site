import { createHmac } from 'node:crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

export type RateLimitPolicy = 'auth' | 'auth-account' | 'expensive-read' | 'expensive-action' | 'csp-report'
type LimitResult = { success: boolean; limit: number; remaining: number; reset: number }
type LimitFunction = (key: string) => Promise<LimitResult>

const definitions: Record<RateLimitPolicy, [number, `${number} ${'s' | 'm'}`]> = {
  // Per IP: generous, because Lithuanian mobile networks put many customers
  // behind one address (CGNAT) and ten strangers must not lock everyone out.
  auth: [60, '15 m'],
  // Per account (hashed email): the limit that actually stops password guessing.
  'auth-account': [8, '15 m'],
  'expensive-read': [60, '1 m'],
  'expensive-action': [5, '10 m'],
  'csp-report': [20, '1 m'],
}

const limiters: Partial<Record<RateLimitPolicy, Ratelimit>> = {}

/**
 * The Upstash REST endpoint and token. Upstash's own names first; the Vercel
 * Marketplace install provides the same store as KV_REST_API_URL/TOKEN.
 */
export function upstashCredentials(env: Record<string, string | undefined> = process.env): { url: string; token: string } | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN
  return url && token ? { url, token } : null
}

function sharedLimiter(policy: RateLimitPolicy): Ratelimit | null {
  const credentials = upstashCredentials()
  if (!credentials) return null
  if (!limiters[policy]) {
    const [count, window] = definitions[policy]
    limiters[policy] = new Ratelimit({
      redis: new Redis(credentials),
      limiter: Ratelimit.slidingWindow(count, window),
      prefix: `statyk:rate:${policy}`,
      analytics: false,
    })
  }
  return limiters[policy]!
}

export function clientFingerprint(request: Request, secret = process.env.BETTER_AUTH_SECRET ?? 'local-only') {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = forwarded || request.headers.get('x-real-ip') || 'unknown'
  return createHmac('sha256', secret).update(address).digest('hex')
}

/** Policies for signed-in actions: counted per session when there is one. */
const PER_SESSION: ReadonlySet<RateLimitPolicy> = new Set(['expensive-read', 'expensive-action'])
const SESSION_COOKIE = /(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=([^;]+)/

/**
 * A key for the signed-in session behind a request, read from its cookie
 * without a database call. Many members share one mobile-network IP, so a
 * per-IP window on "start trial" or "checkout" would let five strangers block
 * the sixth. A forged cookie only gets its own bucket; it is still no session.
 */
export function sessionSubject(request: Request, secret = process.env.BETTER_AUTH_SECRET ?? 'local-only'): string | null {
  const token = request.headers.get('cookie')?.match(SESSION_COOKIE)?.[1]
  return token ? 'sess-' + createHmac('sha256', secret).update(token).digest('hex') : null
}

/** A stable, non-reversible key for one account, so emails never reach Redis. */
export function accountSubject(email: string, secret = process.env.BETTER_AUTH_SECRET ?? 'local-only') {
  return 'acct-' + createHmac('sha256', secret).update(email.trim().toLowerCase()).digest('hex')
}

export async function rateLimitResponse(
  request: Request,
  policy: RateLimitPolicy,
  override?: LimitFunction,
  now = Date.now(),
  /** Count against this subject (e.g. accountSubject) instead of the client IP. */
  subject?: string,
) {
  const limiter = sharedLimiter(policy)
  if (!override && !limiter) {
    if (process.env.VERCEL_ENV === 'production') {
      console.error('[rate-limit] shared Redis is not configured')
      return NextResponse.json(
        { error: 'Paslauga laikinai nepasiekiama.' },
        { status: 503, headers: { 'Retry-After': '60' } },
      )
    }
    return null
  }

  const pathname = new URL(request.url).pathname.slice(0, 120)
  const who = subject ?? (PER_SESSION.has(policy) ? sessionSubject(request) : null) ?? clientFingerprint(request)
  const key = `${who}:${pathname}`
  const result = override ? await override(key) : await limiter!.limit(key)
  if (result.success) return null

  const retryAfter = Math.max(1, Math.ceil((result.reset - now) / 1000))
  return NextResponse.json(
    { error: 'Per daug užklausų. Bandyk dar kartą vėliau.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    },
  )
}
