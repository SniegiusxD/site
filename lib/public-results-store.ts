import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { BOOKS } from '@/lib/landing-signals'
import { type PastSignal, parsePastSignal } from '@/lib/public-results'

export const RESULTS_WINDOW_DAYS = 30

// Copies every started signal from the VM's table into ours before the VM's
// three-day retention deletes it. A row still present on the VM is refreshed:
// the scanner keeps updating its price until the signal closes.
export const ARCHIVE_SQL = `
INSERT INTO signal_record (id, sport, starts_at, market, direction, line, home, away,
                           best_book, best_odds, best_edge, first_seen_at)
SELECT id, sport, starts_at, market, direction, line, home, away,
       best_book, best_odds, best_edge, first_seen_at
  FROM live_signal
 WHERE starts_at < NOW()
ON CONFLICT (id) DO UPDATE
   SET best_book = EXCLUDED.best_book,
       best_odds = EXCLUDED.best_odds,
       best_edge = EXCLUDED.best_edge,
       direction = EXCLUDED.direction,
       archived_at = NOW()
 WHERE (signal_record.best_book, signal_record.best_odds, signal_record.best_edge, signal_record.direction)
       IS DISTINCT FROM (EXCLUDED.best_book, EXCLUDED.best_odds, EXCLUDED.best_edge, EXCLUDED.direction)`

// Only matches that have started: nothing here can reveal a signal a member
// could still bet on.
export const PAST_SIGNALS_SQL = `
SELECT s.id, s.sport, s.starts_at, s.market, s.direction, s.line, s.home, s.away,
       s.best_book, s.best_odds, s.best_edge,
       c.closing_fair_prob, r.outcome
  FROM signal_record s
  LEFT JOIN signal_closing_price c ON c.signal_id = s.id
  LEFT JOIN signal_result r ON r.signal_id = s.id
 WHERE s.starts_at < NOW()
   AND s.starts_at > NOW() - make_interval(days => $1)
 ORDER BY s.starts_at DESC
 LIMIT 3000`

/** Archives started signals; returns how many rows were new or changed. A missing VM table is 0. */
export async function archiveStartedSignals(): Promise<number> {
  await ensureAppSchema()
  try {
    return (await pool.query(ARCHIVE_SQL)).rowCount ?? 0
  } catch (error) {
    if ((error as { code?: string }).code === '42P01') return 0
    throw error
  }
}

/**
 * Started signals of the last month, for the books we cover. Archives first, so
 * the page never shows less than the VM still has. A missing VM table (42P01)
 * is an empty record; any other failure is logged and returns null, so the page
 * can say it could not load rather than claim there were no signals.
 */
export async function loadPastSignals(): Promise<PastSignal[] | null> {
  try {
    await archiveStartedSignals()
    const { rows } = await pool.query(PAST_SIGNALS_SQL, [RESULTS_WINDOW_DAYS])
    return rows
      .map(parsePastSignal)
      .filter((row): row is PastSignal => row !== null && (BOOKS as readonly string[]).includes(row.book))
  } catch (error) {
    if ((error as { code?: string }).code === '42P01') return []
    console.error('[public-results]', error)
    return null
  }
}

/**
 * One started signal by id, for its own page; null when unknown or not started
 * yet. Read-only: anyone can ask for any id, so nothing here writes. A signal
 * not archived yet (started minutes ago) is read from the VM's table instead.
 */
export async function loadPastSignal(id: string): Promise<PastSignal | null> {
  if (!/^[\w-]{1,64}$/.test(id)) return null
  try {
    const { rows } = await pool.query(
      `WITH s AS (
         SELECT id, sport, starts_at, market, direction, line, home, away, best_book, best_odds, best_edge
           FROM signal_record WHERE id = $1
         UNION ALL
         SELECT id, sport, starts_at, market, direction, line, home, away, best_book, best_odds, best_edge
           FROM live_signal WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM signal_record WHERE id = $1)
       )
       SELECT s.*, c.closing_fair_prob, r.outcome
         FROM s
         LEFT JOIN signal_closing_price c ON c.signal_id = s.id
         LEFT JOIN signal_result r ON r.signal_id = s.id
        WHERE s.starts_at < NOW()
        LIMIT 1`,
      [id],
    )
    return rows[0] ? parsePastSignal(rows[0]) : null
  } catch (error) {
    if ((error as { code?: string }).code !== '42P01') console.error('[public-results] one', error)
    return null
  }
}
