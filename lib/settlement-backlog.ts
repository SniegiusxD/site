import { pool } from '@/lib/db'

/**
 * How far grading lags behind the matches we published. The owner page showed
 * only the newest result's time, so a grader stuck on one source (SofaScore 403,
 * 2026-09-25) looked healthy as long as any other result arrived. This counts
 * what is still waiting, by age, from the site's own tables — no VM change.
 */

/** A match this recently started may still be playing: not yet due. */
export const DUE_AFTER_HOURS = 6
/** Flashscore keeps results this long; past it only SofaScore can grade, and it blocks us. */
export const FLASHSCORE_WINDOW_DAYS = 7
export const BACKLOG_WINDOW_DAYS = 30

export type SettlementBacklog = {
  /** Published signals whose match started 6 hours to 30 days ago. */
  due: number
  graded: number
  withClose: number
  /** Still ungraded, by how long ago the match started. */
  waiting: { underDay: number; days1to7: number; over7: number }
  /** Graded in the last 7 days, by the source that settled them. */
  sources7d: Array<{ source: string; count: number }>
}

export type BacklogVerdict = { tone: 'ok' | 'warn'; note: string }

/**
 * Past the Flashscore window a bet can no longer be graded automatically, so any
 * row there is lost unless a new source arrives. A day-old backlog is normal
 * (the grader runs every 15 minutes, some leagues report late); a growing
 * 1–7 day pile is the early sign.
 */
export function judgeBacklog(backlog: SettlementBacklog): BacklogVerdict {
  const { waiting, due, graded } = backlog
  if (due === 0) return { tone: 'ok', note: 'Per 30 dienų nėra rungtynių, kurias reikėtų atsiskaityti.' }
  if (waiting.over7 > 0) {
    return {
      tone: 'warn',
      note: `${waiting.over7} signal. senesni nei ${FLASHSCORE_WINDOW_DAYS} d. ir be rezultato: Flashscore jų nebeturi, reikia kito šaltinio.`,
    }
  }
  if (waiting.days1to7 > Math.max(20, graded * 0.1)) {
    return { tone: 'warn', note: `${waiting.days1to7} signal. laukia rezultato 1–7 d.: atsiskaitymas atsilieka.` }
  }
  return { tone: 'ok', note: 'Atsiskaitymas spėja: laukia tik neseniai pasibaigusios rungtynės.' }
}

const BACKLOG_SQL = `
SELECT COUNT(*) AS due,
       COUNT(r.signal_id) AS graded,
       COUNT(c.signal_id) AS with_close,
       COUNT(*) FILTER (WHERE r.signal_id IS NULL AND s.starts_at >= NOW() - INTERVAL '1 day') AS under_day,
       COUNT(*) FILTER (WHERE r.signal_id IS NULL AND s.starts_at < NOW() - INTERVAL '1 day'
                                                  AND s.starts_at >= NOW() - make_interval(days => $2)) AS days_1_7,
       COUNT(*) FILTER (WHERE r.signal_id IS NULL AND s.starts_at < NOW() - make_interval(days => $2)) AS over_7
  FROM signal_record s
  LEFT JOIN signal_result r ON r.signal_id = s.id
  LEFT JOIN signal_closing_price c ON c.signal_id = s.id
 WHERE s.starts_at < NOW() - make_interval(hours => $1)
   AND s.starts_at > NOW() - make_interval(days => $3)`

const SOURCES_SQL = `
SELECT r.result_source AS source, COUNT(*) AS count
  FROM signal_result r
 WHERE r.graded_at > NOW() - INTERVAL '7 days'
 GROUP BY r.result_source
 ORDER BY COUNT(*) DESC
 LIMIT 6`

/** Null when the VM tables do not exist yet or the query fails; the page says so. */
export async function loadSettlementBacklog(): Promise<SettlementBacklog | null> {
  try {
    const [counts, sources] = await Promise.all([
      pool.query(BACKLOG_SQL, [DUE_AFTER_HOURS, FLASHSCORE_WINDOW_DAYS, BACKLOG_WINDOW_DAYS]),
      pool.query(SOURCES_SQL),
    ])
    const row = counts.rows[0] ?? {}
    return {
      due: Number(row.due ?? 0),
      graded: Number(row.graded ?? 0),
      withClose: Number(row.with_close ?? 0),
      waiting: {
        underDay: Number(row.under_day ?? 0),
        days1to7: Number(row.days_1_7 ?? 0),
        over7: Number(row.over_7 ?? 0),
      },
      sources7d: sources.rows.map((source) => ({ source: String(source.source), count: Number(source.count) })),
    }
  } catch (error) {
    if ((error as { code?: string }).code !== '42P01') console.error('[settlement-backlog]', error)
    return null
  }
}
