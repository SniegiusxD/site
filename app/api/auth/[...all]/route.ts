import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { accountSubject, rateLimitResponse } from '@/lib/rate-limit'

const handlers = toNextJsHandler(auth.handler)

/** Endpoints that take a password or send one: limited per account as well. */
const ACCOUNT_LIMITED = /\/(sign-in|sign-up|forget-password|request-password-reset|reset-password)(\/|$)/

export const GET = handlers.GET
export async function POST(request: Request) {
  const path = new URL(request.url).pathname
  // Signing out must always work, whatever else this address has done.
  if (path.endsWith('/sign-out')) return handlers.POST(request)

  const limited = await rateLimitResponse(request, 'auth')
  if (limited) return limited

  if (ACCOUNT_LIMITED.test(path)) {
    const body = await request
      .clone()
      .json()
      .catch(() => null)
    const email = typeof body?.email === 'string' ? body.email : null
    if (email) {
      const perAccount = await rateLimitResponse(request, 'auth-account', undefined, Date.now(), accountSubject(email))
      if (perAccount) return perAccount
    }
  }
  return handlers.POST(request)
}
