import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { activePause, nextPauseEnd, type PauseDays } from '@/lib/self-pause'

/** Server side of lib/self-pause.ts: user_settings."pausedUntil". */

export async function loadPause(userId: string): Promise<Date | null> {
  await ensureAppSchema()
  const { rows } = await pool.query<{ pausedUntil: Date | null }>(
    `SELECT "pausedUntil" FROM user_settings WHERE "userId" = $1`,
    [userId],
  )
  return activePause(rows[0]?.pausedUntil)
}

/** Starts or extends a break and returns its end. */
export async function startPause(userId: string, days: PauseDays, now = new Date()): Promise<Date> {
  await ensureAppSchema()
  const requested = nextPauseEnd(null, days, now)
  // GREATEST keeps a longer break that is already running; NULL counts as none.
  const { rows } = await pool.query<{ pausedUntil: Date }>(
    `INSERT INTO user_settings ("userId", "pausedUntil", "updatedAt") VALUES ($1, $2, NOW())
     ON CONFLICT ("userId") DO UPDATE
       SET "pausedUntil" = GREATEST(COALESCE(user_settings."pausedUntil", $2), $2), "updatedAt" = NOW()
     RETURNING "pausedUntil"`,
    [userId, requested],
  )
  return rows[0].pausedUntil
}
