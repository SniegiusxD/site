import { pool } from '@/lib/db'
import { BOOKS, type BookName } from '@/lib/landing-signals'

/**
 * Live signals written by the VM after each cycle (aggregator
 * src/site_publisher.py). The site only reads these tables.
 */

export type LivePrice = {
  book: BookName
  odds: number
  /** odds × fair probability − 1 */
  edge: number
  /** This book passed the publication gate for this selection. */
  published: boolean
  eventName: string
  selectionLabel: string
  capturedAt: string
  /** Pinnacle had no price on this exact line; the fair price was interpolated between its neighbours. Null before the VM release. */
  fairPriceInterpolated?: boolean | null
  /** Distance from this line to the nearest real Pinnacle line (0 for exact lines). */
  fairPriceNearestLineDistance?: number | null
}

export type LiveSignal = {
  id: string
  sport: string
  startsAt: string
  market: string
  direction: string | null
  line: number | null
  fairProb: number
  fairOdds: number
  pinnacleOdds: number | null
  home: string | null
  away: string | null
  bestBook: BookName
  bestOdds: number
  bestEdge: number
  status: 'open' | 'closed' | 'started'
  firstSeenAt: string
  lastSeenAt: string
  closedAt: string | null
  /** Pinnacle event id, shared by every line of the same match. */
  eventKey: string | null
  /** Pinnacle's fair probability at the close, once captured. */
  closingFairProb: number | null
  prices: LivePrice[]
}

export type RunnerStatus = {
  /** When the scan cycle started. */
  cycleAt: string
  /** When this cycle's signals were written, about 20 minutes after the start. */
  publishedAt: string
  sharpAvailable: boolean
  publishedCount: number
  events: { pinnacle: number | null; sevenbet: number | null; topsport: number | null; betsson: number | null }
}

export type LiveBoard = { signals: LiveSignal[]; status: RunnerStatus | null }

/** Closed signals stay visible this long so an open detail can say "closed". */
const CLOSED_VISIBLE_HOURS = 3

const iso = (value: Date | string | null) => (value === null ? null : new Date(value).toISOString())

export async function loadLiveBoard(): Promise<LiveBoard> {
  try {
    const [signalsResult, statusResult] = await Promise.all([
      pool.query(
        `SELECT s.*,
                -- Whole rows, so columns added by a VM release (interpolation fields)
                -- arrive without this query naming columns that may not exist yet.
                COALESCE(
                  json_agg(to_jsonb(p) ORDER BY p.odds DESC)
                  FILTER (WHERE p.book IS NOT NULL), '[]') AS prices
           FROM live_signal s
           LEFT JOIN live_signal_price p ON p.signal_id = s.id
          WHERE s.status = 'open'
             OR s.closed_at > NOW() - make_interval(hours => $1)
          GROUP BY s.id
          ORDER BY (s.status = 'open') DESC, s.best_edge DESC`,
        [CLOSED_VISIBLE_HOURS],
      ),
      pool.query(`SELECT * FROM runner_status WHERE id = 1`),
    ])

    const signals: LiveSignal[] = signalsResult.rows
      .filter((row) => BOOKS.includes(row.best_book))
      .map((row) => ({
        id: row.id,
        sport: row.sport,
        startsAt: iso(row.starts_at)!,
        market: row.market,
        direction: row.direction,
        line: row.line,
        fairProb: row.fair_prob,
        fairOdds: 1 / row.fair_prob,
        pinnacleOdds: row.pinnacle_odds,
        home: row.home,
        away: row.away,
        bestBook: row.best_book,
        bestOdds: row.best_odds,
        bestEdge: row.best_edge,
        status: row.status,
        firstSeenAt: iso(row.first_seen_at)!,
        lastSeenAt: iso(row.last_seen_at)!,
        closedAt: iso(row.closed_at),
        eventKey: row.event_key ?? null,
        closingFairProb: row.closing_fair_prob ?? null,
        prices: (row.prices as Array<Record<string, unknown>>)
          .filter((price) => BOOKS.includes(price.book as BookName))
          .map((price) => ({
            book: price.book as BookName,
            odds: Number(price.odds),
            edge: Number(price.edge),
            published: Boolean(price.published),
            eventName: String(price.event_name ?? ''),
            selectionLabel: String(price.selection_label ?? ''),
            capturedAt: iso(price.captured_at as string)!,
            fairPriceInterpolated: typeof price.fair_price_interpolated === 'boolean' ? price.fair_price_interpolated : null,
            fairPriceNearestLineDistance:
              price.fair_price_nearest_line_distance == null ? null : Number(price.fair_price_nearest_line_distance),
          })),
      }))

    const statusRow = statusResult.rows[0]
    const status: RunnerStatus | null = statusRow
      ? {
          cycleAt: iso(statusRow.cycle_at)!,
          publishedAt: iso(statusRow.updated_at ?? statusRow.cycle_at)!,
          sharpAvailable: statusRow.sharp_available,
          publishedCount: statusRow.published_count,
          events: {
            pinnacle: statusRow.pinnacle_events,
            sevenbet: statusRow.sevenbet_events,
            topsport: statusRow.topsport_events,
            betsson: statusRow.betsson_events,
          },
        }
      : null

    return { signals, status }
  } catch (error) {
    // Tables not created yet (fresh database): an empty board, not a crash.
    if ((error as { code?: string }).code === '42P01') return { signals: [], status: null }
    throw error
  }
}
