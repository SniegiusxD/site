import { pool } from '@/lib/db'

/**
 * Is the product alive, as a member would see it: the database answers and the
 * scanner published recently. A normal cycle is ~40 minutes, so 90 minutes
 * without a publication means a cycle was missed — on 2026-09-24 a deploy left
 * the scanner stopped for 3.5 hours and nobody was told.
 */
export const STALE_AFTER_MINUTES = 90

export type Health = {
  ok: boolean
  database: boolean
  lastPublishedAt: string | null
  minutesSincePublish: number | null
  problem: 'database' | 'no-status' | 'stale' | null
}

export function judgeHealth(lastPublishedAt: string | null, now: Date, database = true): Health {
  if (!database) return { ok: false, database, lastPublishedAt: null, minutesSincePublish: null, problem: 'database' }
  if (!lastPublishedAt) return { ok: false, database, lastPublishedAt: null, minutesSincePublish: null, problem: 'no-status' }
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(lastPublishedAt).getTime()) / 60_000))
  const stale = minutes > STALE_AFTER_MINUTES
  return { ok: !stale, database, lastPublishedAt, minutesSincePublish: minutes, problem: stale ? 'stale' : null }
}

export async function loadHealth(now: Date = new Date()): Promise<Health> {
  try {
    const { rows } = await pool.query(`SELECT COALESCE(updated_at, cycle_at) AS at FROM runner_status WHERE id = 1`)
    const at = rows[0]?.at ? new Date(rows[0].at).toISOString() : null
    return judgeHealth(at, now)
  } catch (error) {
    console.error('[health]', error)
    return judgeHealth(null, now, false)
  }
}
