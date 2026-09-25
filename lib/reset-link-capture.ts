import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Lets the owner make a password-reset link without email: inside
 * `captureResetLink`, better-auth's own reset flow runs as usual (token, expiry,
 * single use), but the link is handed back here instead of being emailed.
 */
const capture = new AsyncLocalStorage<{ token?: string }>()

/**
 * The link a member opens: better-auth's callback, which checks the token and
 * sends them on to /slaptazodis/naujas. Built here from the token because the
 * `url` better-auth passes lacks the /api/auth prefix when its base URL is
 * derived from the request (seen 2026-09-25: it pointed at /reset-password/…).
 */
export function resetLinkFor(token: string, origin: string): string {
  return new URL(`/api/auth/reset-password/${token}?callbackURL=${encodeURIComponent('/slaptazodis/naujas')}`, origin).toString()
}

/** Runs a reset request and returns its token instead of letting it be emailed. */
export async function captureResetToken(run: () => Promise<unknown>): Promise<string | null> {
  const store: { token?: string } = {}
  await capture.run(store, run)
  return store.token ?? null
}

/** Called by the auth config's sendResetPassword: true when the token was captured, so no email goes out. */
export function takeResetToken(token: string): boolean {
  const store = capture.getStore()
  if (!store) return false
  store.token = token
  return true
}
