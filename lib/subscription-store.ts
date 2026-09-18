import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { type Access, accessFrom, type SubscriptionRow, trialEndFrom } from '@/lib/subscription'

/** Every account starts free: signing up costs nothing and takes no trial. */
export async function ensureSubscription(userId: string): Promise<void> {
  await ensureAppSchema()
  await pool.query(
    `INSERT INTO subscription ("userId", status) VALUES ($1, 'free')
     ON CONFLICT ("userId") DO NOTHING`,
    [userId],
  )
}

/**
 * Starts the 7 free days. Returns false when they were already taken, so the
 * trial cannot be restarted by calling this again.
 */
export async function startTrial(userId: string, now: Date = new Date()): Promise<boolean> {
  await ensureSubscription(userId)
  const { rowCount } = await pool.query(
    `UPDATE subscription
        SET status = 'trialing',
            "trialStartedAt" = $2,
            "trialEndsAt" = $3,
            "updatedAt" = NOW()
      WHERE "userId" = $1 AND "trialStartedAt" IS NULL AND status IN ('free', 'expired')`,
    [userId, now, trialEndFrom(now)],
  )
  return rowCount === 1
}

export async function getAccess(userId: string): Promise<Access> {
  await ensureAppSchema()
  const select = () =>
    pool.query<SubscriptionRow>(
      `SELECT status, "trialEndsAt", "trialStartedAt", "currentPeriodEnd" FROM subscription WHERE "userId" = $1`,
      [userId],
    )
  let { rows } = await select()
  if (!rows[0]) {
    await ensureSubscription(userId)
    ;({ rows } = await select())
  }
  return accessFrom(rows[0])
}
