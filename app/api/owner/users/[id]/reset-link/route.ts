import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { isOwner } from '@/lib/owner'
import { rateLimitResponse } from '@/lib/rate-limit'
import { captureResetToken, resetLinkFor } from '@/lib/reset-link-capture'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

/**
 * Owner-only: a one-hour, single-use password-reset link for a member who
 * cannot receive email (none configured yet, or a dead inbox). Made by
 * better-auth's own reset flow; audited like the access changes. The owner
 * passes it on after checking who is asking. Non-owners always see 404.
 */
export async function POST(request: Request, context: Context) {
  const user = await getSessionUser()
  if (!user || !isOwner(user.email)) return NextResponse.json({ error: 'Nerasta.' }, { status: 404 })
  const limited = await rateLimitResponse(request, 'expensive-action')
  if (limited) return limited

  const { id } = await context.params
  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
  if (!id || id.length > 128) return NextResponse.json({ error: 'Netinkamas narys.' }, { status: 400 })
  if (reason.length < 3) return NextResponse.json({ error: 'Įrašyk priežastį.' }, { status: 400 })

  try {
    await ensureAppSchema()
    const { rows } = await pool.query<{ email: string }>(`SELECT email FROM "user" WHERE id = $1`, [id])
    const email = rows[0]?.email
    if (!email) return NextResponse.json({ error: 'Narys nerastas.' }, { status: 404 })

    const token = await captureResetToken(() =>
      auth.api.requestPasswordReset({ body: { email, redirectTo: '/slaptazodis/naujas' }, headers: request.headers }),
    )
    if (!token) return NextResponse.json({ error: 'Nepavyko sukurti nuorodos.' }, { status: 500 })

    const auditId = randomUUID()
    await pool.query(
      `INSERT INTO admin_action (id, "actorEmail", "targetUserId", action, reason, "until", "before", "after", "at")
       VALUES ($1, $2, $3, 'reset_link', $4, NOW() + INTERVAL '1 hour', '{}'::jsonb, '{}'::jsonb, NOW())`,
      [auditId, user.email.trim().toLowerCase(), id, reason],
    )
    // The same link the email would carry: through the auth callback, which checks the token.
    return NextResponse.json({ link: resetLinkFor(token, request.url), auditId })
  } catch (error) {
    console.error('[api/owner/users/reset-link]', error)
    return NextResponse.json({ error: 'Nepavyko sukurti nuorodos.' }, { status: 500 })
  }
}
