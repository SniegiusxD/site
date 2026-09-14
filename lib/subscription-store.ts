import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { type Access, accessFrom, type SubscriptionRow, trialEndFrom } from '@/lib/subscription'

/** Starts the 7-day trial. Does nothing if the account already has a row. */
export async function startTrial(userId: string, now: Date = new Date()): Promise<void> {
  await ensureAppSchema()
  await pool.query(
    `INSERT INTO subscription ("userId", status, "trialEndsAt")
     VALUES ($1, 'trialing', $2)
     ON CONFLICT ("userId") DO NOTHING`,
    [userId, trialEndFrom(now)],
  )
}

export async function getAccess(userId: string): Promise<Access> {
  await ensureAppSchema()
  const select = () =>
    pool.query<SubscriptionRow>(
      `SELECT status, "trialEndsAt", "currentPeriodEnd" FROM subscription WHERE "userId" = $1`,
      [userId],
    )
  let { rows } = await select()
  if (!rows[0]) {
    // Accounts created before trials existed get their 7 days from now.
    await startTrial(userId)
    ;({ rows } = await select())
  }
  return accessFrom(rows[0])
}
