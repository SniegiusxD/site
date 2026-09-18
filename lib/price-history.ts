import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import type { BookName } from '@/lib/landing-signals'
import type { Movement, MovementMap } from '@/lib/price-movement'

export type { Movement, MovementMap } from '@/lib/price-movement'
export { driftOf, DRIFT_FLOOR } from '@/lib/price-movement'

/**
 * Price history. The VM's `live_signal_price` holds only the current cycle —
 * every scan overwrites it — so nothing could say whether a price is drifting.
 * This copies each new capture into our own append-only table, which is what
 * makes movement ("dropping odds") answerable at all.
 *
 * Nothing is backfilled: a signal shows movement once it has been seen in two
 * cycles, and not before.
 */

const KEEP_DAYS = 10

/**
 * Copies captures newer than the newest one already stored. Runs on a board
 * load; a poll that brings no new cycle inserts nothing.
 */
export async function recordObservations(): Promise<number> {
  await ensureAppSchema()
  try {
    const { rowCount } = await pool.query(
      `INSERT INTO price_observation ("signalId", book, odds, edge, "capturedAt")
       SELECT p.signal_id, p.book, p.odds, p.edge, p.captured_at
         FROM live_signal_price p
        WHERE p.captured_at > COALESCE((SELECT MAX("capturedAt") FROM price_observation), 'epoch'::timestamptz)
       ON CONFLICT DO NOTHING`,
    )
    return rowCount ?? 0
  } catch (error) {
    // The VM tables may not exist yet on a fresh database.
    if ((error as { code?: string }).code === '42P01') return 0
    throw error
  }
}

/** Drops history the board can no longer show. Cheap, and only worth doing rarely. */
export async function pruneObservations(): Promise<void> {
  await pool.query(`DELETE FROM price_observation WHERE "capturedAt" < NOW() - make_interval(days => $1)`, [KEEP_DAYS])
}

/** First and last recorded price for each of these signals. */
export async function loadMovement(signalIds: string[]): Promise<MovementMap> {
  if (signalIds.length === 0) return {}
  await ensureAppSchema()
  const { rows } = await pool.query<{
    signalId: string
    book: string
    firstOdds: number
    lastOdds: number
    seen: string
    firstAt: Date
    lastAt: Date
  }>(
    `SELECT "signalId", book,
            (array_agg(odds ORDER BY "capturedAt"))[1] AS "firstOdds",
            (array_agg(odds ORDER BY "capturedAt" DESC))[1] AS "lastOdds",
            COUNT(*) AS seen,
            MIN("capturedAt") AS "firstAt",
            MAX("capturedAt") AS "lastAt"
       FROM price_observation
      WHERE "signalId" = ANY($1)
      GROUP BY 1, 2`,
    [signalIds],
  )

  const map: MovementMap = {}
  for (const row of rows) {
    const seen = Number(row.seen)
    // One observation is not a movement.
    if (seen < 2) continue
    map[row.signalId] ??= {}
    map[row.signalId][row.book as BookName] = {
      first: Number(row.firstOdds),
      last: Number(row.lastOdds),
      seen,
      firstAt: row.firstAt.toISOString(),
      lastAt: row.lastAt.toISOString(),
    }
  }
  return map
}

/** Every recorded price for one signal, oldest first: the detail sparkline. */
export async function loadSeries(signalId: string): Promise<Array<{ book: BookName; odds: number; at: string }>> {
  await ensureAppSchema()
  const { rows } = await pool.query<{ book: string; odds: number; capturedAt: Date }>(
    `SELECT book, odds, "capturedAt" FROM price_observation WHERE "signalId" = $1 ORDER BY "capturedAt"`,
    [signalId],
  )
  return rows.map((row) => ({ book: row.book as BookName, odds: Number(row.odds), at: row.capturedAt.toISOString() }))
}

