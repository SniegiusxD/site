import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { accessFrom, type Access, type SubscriptionRow } from '@/lib/subscription'

export type OwnerMutationAction = 'grant' | 'extend_trial' | 'revoke'
export type ParsedOwnerMutation = {
  action: OwnerMutationAction
  reason: string
  until: Date | null
  days: number | null
}

type ParseResult = { ok: true; value: ParsedOwnerMutation } | { ok: false; error: 'action' | 'reason' | 'until' | 'days' }

/** Strict request parsing kept pure so malformed owner actions never reach SQL. */
export function parseOwnerMutation(action: string, body: unknown, now: Date = new Date()): ParseResult {
  if (action !== 'grant' && action !== 'extend-trial' && action !== 'revoke') return { ok: false, error: 'action' }
  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {}
  const reason = typeof input.reason === 'string' ? input.reason.trim() : ''
  if (reason.length < 3 || reason.length > 500) return { ok: false, error: 'reason' }

  if (action === 'grant') {
    const until = typeof input.until === 'string' ? new Date(input.until) : new Date(Number.NaN)
    if (!Number.isFinite(until.getTime()) || until <= now) return { ok: false, error: 'until' }
    return { ok: true, value: { action: 'grant', reason, until, days: null } }
  }
  if (action === 'extend-trial') {
    const days = typeof input.days === 'number' ? input.days : Number.NaN
    if (!Number.isInteger(days) || days < 1 || days > 365) return { ok: false, error: 'days' }
    return { ok: true, value: { action: 'extend_trial', reason, until: null, days } }
  }
  return { ok: true, value: { action: 'revoke', reason, until: null, days: null } }
}

type SubscriptionSnapshot = SubscriptionRow & {
  provider: string | null
  providerCustomerId: string | null
}

export type OwnerMember = {
  id: string
  name: string
  email: string
  createdAt: string
  providerCustomerId: string | null
  adminAccessUntil: string | null
  access: Access
}

export class OwnerMutationError extends Error {
  constructor(public readonly code: 'not_found' | 'paid_subscription') {
    super(code)
  }
}

const SUBSCRIPTION_COLUMNS = `s.status, s."trialEndsAt", s."trialStartedAt", s."currentPeriodEnd",
  s."adminAccessUntil", s.provider, s."providerCustomerId"`

export async function searchOwnerMembers(query: string, now: Date = new Date()): Promise<OwnerMember[]> {
  await ensureAppSchema()
  const q = query.trim().slice(0, 120)
  const { rows } = await pool.query<SubscriptionSnapshot & { id: string; name: string; email: string; createdAt: Date }>(
    `SELECT u.id, u.name, u.email, u."createdAt", ${SUBSCRIPTION_COLUMNS}
       FROM "user" u
       LEFT JOIN subscription s ON s."userId" = u.id
      WHERE ($1 = '' OR u.email ILIKE '%' || $1 || '%')
        AND u.email NOT LIKE 'e2e-check-%'
        AND u.email NOT LIKE '%@signalai.local'
        AND u.email NOT LIKE '%@example.com'
      ORDER BY u."createdAt" DESC
      LIMIT 25`,
    [q],
  )
  return rows.map((row) => {
    const subscription: SubscriptionRow = row.status
      ? row
      : { status: 'free', trialEndsAt: null, trialStartedAt: null, currentPeriodEnd: null, adminAccessUntil: null }
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: new Date(row.createdAt).toISOString(),
      providerCustomerId: row.providerCustomerId ?? null,
      adminAccessUntil: row.adminAccessUntil ? new Date(row.adminAccessUntil).toISOString() : null,
      access: accessFrom(subscription, now),
    }
  })
}

/** Mutate access and append its complete before/after audit in one transaction. */
export async function applyOwnerMutation(
  targetUserId: string,
  actorEmail: string,
  mutation: ParsedOwnerMutation,
  now: Date = new Date(),
): Promise<{ access: Access; auditId: string }> {
  await ensureAppSchema()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const target = await client.query(`SELECT id FROM "user" WHERE id = $1 FOR UPDATE`, [targetUserId])
    if (!target.rows[0]) throw new OwnerMutationError('not_found')
    await client.query(
      `INSERT INTO subscription ("userId", status) VALUES ($1, 'free') ON CONFLICT ("userId") DO NOTHING`,
      [targetUserId],
    )
    const beforeResult = await client.query<SubscriptionSnapshot>(
      `SELECT status, "trialEndsAt", "trialStartedAt", "currentPeriodEnd", "adminAccessUntil", provider, "providerCustomerId"
         FROM subscription WHERE "userId" = $1 FOR UPDATE`,
      [targetUserId],
    )
    const before = beforeResult.rows[0]

    if (mutation.action === 'grant') {
      await client.query(
        `UPDATE subscription SET "adminAccessUntil" = $2, "updatedAt" = NOW() WHERE "userId" = $1`,
        [targetUserId, mutation.until],
      )
    } else if (mutation.action === 'revoke') {
      await client.query(
        `UPDATE subscription SET "adminAccessUntil" = NULL, "updatedAt" = NOW() WHERE "userId" = $1`,
        [targetUserId],
      )
    } else {
      const paidEnd = before.currentPeriodEnd ? new Date(before.currentPeriodEnd) : null
      if ((before.status === 'active' || before.status === 'canceled') && paidEnd && paidEnd > now) {
        throw new OwnerMutationError('paid_subscription')
      }
      const currentEnd = before.trialEndsAt ? new Date(before.trialEndsAt) : null
      const base = currentEnd && currentEnd > now ? currentEnd : now
      const until = new Date(base.getTime() + mutation.days! * 86_400_000)
      await client.query(
        `UPDATE subscription
            SET status = 'trialing', "trialStartedAt" = COALESCE("trialStartedAt", $2),
                "trialEndsAt" = $3, "updatedAt" = NOW()
          WHERE "userId" = $1`,
        [targetUserId, now, until],
      )
    }

    const afterResult = await client.query<SubscriptionSnapshot>(
      `SELECT status, "trialEndsAt", "trialStartedAt", "currentPeriodEnd", "adminAccessUntil", provider, "providerCustomerId"
         FROM subscription WHERE "userId" = $1`,
      [targetUserId],
    )
    const after = afterResult.rows[0]
    const auditId = randomUUID()
    await client.query(
      `INSERT INTO admin_action
        (id, "actorEmail", "targetUserId", action, reason, "until", "before", "after", "at")
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)`,
      [auditId, actorEmail.trim().toLowerCase(), targetUserId, mutation.action, mutation.reason,
        mutation.until, JSON.stringify(before), JSON.stringify(after), now],
    )
    await client.query('COMMIT')
    return { access: accessFrom(after, now), auditId }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
