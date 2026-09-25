import { pool } from '@/lib/db'
import { type PastSignal, parsePastSignal } from '@/lib/public-results'

export const RESULTS_WINDOW_DAYS = 30

// Only matches that have started: nothing here can reveal a signal a member
// could still bet on.
export const PAST_SIGNALS_SQL = `
SELECT s.id, s.sport, s.starts_at, s.market, s.direction, s.line, s.home, s.away,
       s.best_book, s.best_odds, s.best_edge,
       c.closing_fair_prob, r.outcome
  FROM live_signal s
  LEFT JOIN signal_closing_price c ON c.signal_id = s.id
  LEFT JOIN signal_result r ON r.signal_id = s.id
 WHERE s.starts_at < NOW()
   AND s.starts_at > NOW() - make_interval(days => $1)
 ORDER BY s.starts_at DESC
 LIMIT 3000`

/**
 * Started signals of the last month. A missing VM table (42P01) is an empty
 * record; any other failure is logged and returns null, so the page can say it
 * could not load rather than claim there were no signals.
 */
export async function loadPastSignals(): Promise<PastSignal[] | null> {
  try {
    const { rows } = await pool.query(PAST_SIGNALS_SQL, [RESULTS_WINDOW_DAYS])
    return rows.map(parsePastSignal).filter((row): row is PastSignal => row !== null)
  } catch (error) {
    if ((error as { code?: string }).code === '42P01') return []
    console.error('[public-results]', error)
    return null
  }
}
