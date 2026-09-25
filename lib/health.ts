import { pool } from '@/lib/db'

/**
 * Is the product alive, as a member would see it: the database answers and the
 * scanner published recently. A normal cycle is ~40 minutes, so 90 minutes
 * without a publication means a cycle was missed — on 2026-09-24 a deploy left
 * the scanner stopped for 3.5 hours and nobody was told.
 */
export const STALE_AFTER_MINUTES = 90

/**
 * Results. The grader stood still from 09-19 to 09-25 and nothing here noticed:
 * the VM logged an alert nobody reads. If no result has reached the site for
 * this long while matches we published have finished, grading is stuck.
 */
export const RESULTS_STALE_AFTER_HOURS = 24

export type ResultsInput = {
  /** Newest write to signal_result; null when there has never been one. */
  lastResultAt: string | null
  /** Published signals whose match started 6–48 hours ago, which should be gradable by now. */
  finishedRecently: number
}

export type Health = {
  ok: boolean
  database: boolean
  lastPublishedAt: string | null
  minutesSincePublish: number | null
  lastResultAt: string | null
  problem: 'database' | 'no-status' | 'stale' | 'results-stale' | null
}

/** Stuck only when there was something to grade: a quiet day is not a failure. */
export function resultsStale(results: ResultsInput, now: Date): boolean {
  if (results.finishedRecently === 0) return false
  if (!results.lastResultAt) return true
  return now.getTime() - new Date(results.lastResultAt).getTime() > RESULTS_STALE_AFTER_HOURS * 3_600_000
}

export function judgeHealth(
  lastPublishedAt: string | null,
  now: Date,
  database = true,
  results: ResultsInput = { lastResultAt: null, finishedRecently: 0 },
): Health {
  const base = { database, lastPublishedAt: null, minutesSincePublish: null, lastResultAt: results.lastResultAt }
  if (!database) return { ...base, ok: false, lastResultAt: null, problem: 'database' }
  if (!lastPublishedAt) return { ...base, ok: false, problem: 'no-status' }
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(lastPublishedAt).getTime()) / 60_000))
  // A missed cycle is the more urgent of the two, so it is the one named.
  const problem = minutes > STALE_AFTER_MINUTES ? 'stale' : resultsStale(results, now) ? 'results-stale' : null
  return { ...base, ok: problem === null, lastPublishedAt, minutesSincePublish: minutes, problem }
}

export async function loadHealth(now: Date = new Date()): Promise<Health> {
  try {
    const { rows } = await pool.query(`SELECT COALESCE(updated_at, cycle_at) AS at FROM runner_status WHERE id = 1`)
    const at = rows[0]?.at ? new Date(rows[0].at).toISOString() : null
    return judgeHealth(at, now, true, await loadResultsInput())
  } catch (error) {
    console.error('[health]', error)
    return judgeHealth(null, now, false)
  }
}

async function loadResultsInput(): Promise<ResultsInput> {
  try {
    const { rows } = await pool.query(
      `SELECT (SELECT MAX(updated_at) FROM signal_result) AS last,
              (SELECT COUNT(*) FROM live_signal
                WHERE starts_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '6 hours') AS finished`,
    )
    return {
      lastResultAt: rows[0]?.last ? new Date(rows[0].last).toISOString() : null,
      finishedRecently: Number(rows[0]?.finished ?? 0),
    }
  } catch (error) {
    // Before the VM created its result table there is nothing to judge.
    if ((error as { code?: string }).code !== '42P01') console.error('[health] results', error)
    return { lastResultAt: null, finishedRecently: 0 }
  }
}
