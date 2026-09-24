import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { bookRequestTally, type BookRequestTally } from '@/lib/book-requests'
import { executionSummary, type ExecutionSummary } from '@/lib/execution-events'
import { type Access, accessFrom, PRICE_EUR_PER_MONTH, type SubscriptionRow } from '@/lib/subscription'

/**
 * The owner's view of the business. Who counts as owner comes from the
 * OWNER_EMAILS environment variable (comma separated) and nothing else: no
 * request can make an account an owner. Test accounts are left out of every
 * figure (see REAL_USER).
 */

export function ownerEmails(env: string | undefined = process.env.OWNER_EMAILS): string[] {
  return (env ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isOwner(email: string | null | undefined, env: string | undefined = process.env.OWNER_EMAILS): boolean {
  return Boolean(email) && ownerEmails(env).includes(email!.trim().toLowerCase())
}

// Test accounts: the e2e scripts (e2e-check-…), the June seed accounts
// (@signalai.local) and manual checks on @example.com.
const REAL_USER = `u.email NOT LIKE 'e2e-check-%' AND u.email NOT LIKE '%@signalai.local' AND u.email NOT LIKE '%@example.com'`

export type AccessCounts = Record<Access['state'], number>

/** Counts by access state, and how many of the paying ones pay through Stripe. */
export function countAccess(
  rows: Array<SubscriptionRow & { provider: string | null }>,
  now: Date = new Date(),
): { counts: AccessCounts; payingStripe: number } {
  const counts: AccessCounts = { free: 0, trial: 0, active: 0, ending: 0, expired: 0 }
  let payingStripe = 0
  for (const row of rows) {
    const state = accessFrom(row, now).state
    counts[state] += 1
    if (state === 'active' && row.provider === 'stripe') payingStripe += 1
  }
  return { counts, payingStripe }
}

/** All of the last `days` Vilnius calendar days, oldest first, with zeros where nobody signed up. */
export function fillDays(rows: Array<{ day: string; count: number }>, now: Date, days = 30): Array<{ day: string; count: number }> {
  const byDay = new Map(rows.map((row) => [row.day, row.count]))
  const vilnius = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius' })
  return Array.from({ length: days }, (_, index) => {
    const day = vilnius.format(new Date(now.getTime() - (days - 1 - index) * 86_400_000))
    return { day, count: byDay.get(day) ?? 0 }
  })
}

export type FeedbackRow = { id: string; kind: string; message: string; page: string | null; contactOk: boolean; status: string; createdAt: string; email: string }

export type OwnerMetrics = {
  generatedAt: string
  members: number
  onboarded: number
  signupsByDay: Array<{ day: string; count: number }>
  signups7d: number
  signups30d: number
  access: AccessCounts
  payingStripe: number
  mrrEur: number
  trialsStarted30d: number
  /** Of members who ever started a trial, how many pay or paid through Stripe. */
  trialToPaid: { trials: number; paid: number }
  bets7d: number
  bettingMembers7d: number
  execution: ExecutionSummary
  bookRequests: BookRequestTally[]
  feedback: FeedbackRow[]
}

export async function ownerMetrics(now: Date = new Date()): Promise<OwnerMetrics> {
  await ensureAppSchema()
  const [members, days, subs, trials, bets, execution, bookRequests, feedback] = await Promise.all([
    pool.query(
      `SELECT count(*)::int AS members,
              count(s."onboardedAt")::int AS onboarded,
              count(*) FILTER (WHERE u."createdAt" > NOW() - INTERVAL '7 days')::int AS "signups7d",
              count(*) FILTER (WHERE u."createdAt" > NOW() - INTERVAL '30 days')::int AS "signups30d"
         FROM "user" u LEFT JOIN user_settings s ON s."userId" = u.id
        WHERE ${REAL_USER}`,
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', u."createdAt" AT TIME ZONE 'Europe/Vilnius'), 'YYYY-MM-DD') AS day, count(*)::int AS count
         FROM "user" u
        WHERE ${REAL_USER} AND u."createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 1`,
    ),
    pool.query(
      `SELECT coalesce(s.status, 'free') AS status, s."trialEndsAt", s."trialStartedAt", s."currentPeriodEnd", s.provider
         FROM "user" u LEFT JOIN subscription s ON s."userId" = u.id
        WHERE ${REAL_USER}`,
    ),
    pool.query(
      `SELECT count(*) FILTER (WHERE s."trialStartedAt" > NOW() - INTERVAL '30 days')::int AS "started30d",
              count(*) FILTER (WHERE s."trialStartedAt" IS NOT NULL)::int AS trials,
              count(*) FILTER (WHERE s."trialStartedAt" IS NOT NULL AND s.provider = 'stripe'
                                 AND s.status IN ('active', 'canceled'))::int AS paid
         FROM subscription s JOIN "user" u ON u.id = s."userId"
        WHERE ${REAL_USER}`,
    ),
    pool.query(
      `SELECT count(*)::int AS bets, count(DISTINCT b."userId")::int AS members
         FROM user_bet b JOIN "user" u ON u.id = b."userId"
        WHERE ${REAL_USER} AND b."placedAt" > NOW() - INTERVAL '7 days'`,
    ),
    executionSummary(30),
    bookRequestTally(),
    pool.query(
      `SELECT f.id, f.kind, f.message, f.page, f."contactOk", f.status, f."createdAt", u.email
         FROM feedback f JOIN "user" u ON u.id = f."userId"
        WHERE ${REAL_USER}
        ORDER BY (f.status = 'new') DESC, f."createdAt" DESC
        LIMIT 60`,
    ),
  ])

  const { counts, payingStripe } = countAccess(subs.rows, now)
  return {
    generatedAt: now.toISOString(),
    members: members.rows[0].members,
    onboarded: members.rows[0].onboarded,
    signupsByDay: fillDays(days.rows, now),
    signups7d: members.rows[0].signups7d,
    signups30d: members.rows[0].signups30d,
    access: counts,
    payingStripe,
    mrrEur: payingStripe * PRICE_EUR_PER_MONTH,
    trialsStarted30d: trials.rows[0].started30d,
    trialToPaid: { trials: trials.rows[0].trials, paid: trials.rows[0].paid },
    bets7d: bets.rows[0].bets,
    bettingMembers7d: bets.rows[0].members,
    execution,
    bookRequests,
    feedback: feedback.rows.map((row) => ({ ...row, createdAt: new Date(row.createdAt).toISOString() })),
  }
}

/** Marks a feedback note handled or back to new. Returns whether a row changed. */
export async function setFeedbackStatus(id: string, status: 'new' | 'done'): Promise<boolean> {
  await ensureAppSchema()
  const { rowCount } = await pool.query(`UPDATE feedback SET status = $2 WHERE id = $1`, [id, status])
  return (rowCount ?? 0) > 0
}
