import { headers } from 'next/headers'
import { auth } from '@/lib/auth'

/**
 * The signed-in user for this request, or null. Server only.
 *
 * A session lookup is a database call, and a database that is briefly
 * unreachable used to take the sign-in page down with a 500. Treating the
 * failure as "not signed in" shows the form instead; the sign-in attempt that
 * follows reports the real error.
 */
export async function getSessionUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user ?? null
  } catch (error) {
    // Next signals redirects, not-found and "this route is dynamic" by throwing
    // errors that carry a digest. Those are control flow, not failures, and
    // swallowing them would render these pages statically.
    if (typeof (error as { digest?: unknown }).digest === 'string') throw error
    console.error('[session]', error)
    return null
  }
}
