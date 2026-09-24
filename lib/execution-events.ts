import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { BOOKS, type BookName } from '@/lib/landing-signals'

/**
 * Execution events: the steps between seeing a signal and betting it. The
 * site records two — opening the bookmaker's event page and copying the event
 * name to search for it. The placed bet itself is the user_bet row, which
 * already carries signalId, the odds and placedAt.
 */

export const EXECUTION_KINDS = ['open_book', 'copy_event'] as const
export type ExecutionKind = (typeof EXECUTION_KINDS)[number]

export type ExecutionEvent = {
  signalId: string
  book: BookName
  kind: ExecutionKind
  shownOdds: number | null
  shownEdge: number | null
  firstSeenAt: string | null
}

const finite = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null

export function parseExecutionEvent(input: unknown): ExecutionEvent | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const signalId = typeof raw.signalId === 'string' ? raw.signalId.trim() : ''
  if (!signalId || signalId.length > 200) return null
  if (!BOOKS.includes(raw.book as BookName)) return null
  if (!EXECUTION_KINDS.includes(raw.kind as ExecutionKind)) return null
  const seen = typeof raw.firstSeenAt === 'string' ? new Date(raw.firstSeenAt) : null
  return {
    signalId,
    book: raw.book as BookName,
    kind: raw.kind as ExecutionKind,
    shownOdds: finite(raw.shownOdds, 1, 1000),
    shownEdge: finite(raw.shownEdge, -1, 10),
    firstSeenAt: seen && !Number.isNaN(seen.getTime()) ? seen.toISOString() : null,
  }
}

/**
 * Records one event. A repeat of the same step on the same signal within a
 * minute is a double click or a re-render, not a second decision, and is
 * dropped. Returns whether a row was written.
 */
export async function recordExecutionEvent(userId: string, event: ExecutionEvent): Promise<boolean> {
  await ensureAppSchema()
  const { rowCount } = await pool.query(
    `INSERT INTO execution_event (id, "userId", "signalId", book, kind, "shownOdds", "shownEdge", "firstSeenAt")
     SELECT $1, $2, $3, $4, $5, $6, $7, $8
     WHERE NOT EXISTS (
       SELECT 1 FROM execution_event
       WHERE "userId" = $2 AND "signalId" = $3 AND book = $4 AND kind = $5 AND "at" > NOW() - INTERVAL '1 minute'
     )`,
    [randomUUID(), userId, event.signalId, event.book, event.kind, event.shownOdds, event.shownEdge, event.firstSeenAt],
  )
  return (rowCount ?? 0) > 0
}

export type ExecutionTiming = {
  /** First step taken on a signal, minutes after we first saw its price. */
  seenToAction: number | null
  /** Placed bet, minutes after that first step. */
  actionToBet: number | null
  /** Recorded odds against the odds shown at the first step: 2.10 → 2.05 is -0.05. */
  oddsSlip: number | null
}

/**
 * Per-signal timing for one member's first step and their bet on the same
 * signal. Pure, so the owner dashboard and tests share it.
 */
export function executionTiming(
  firstEvent: { at: string; firstSeenAt: string | null; shownOdds: number | null } | null,
  bet: { placedAt: string; odds: number } | null,
): ExecutionTiming {
  const minutes = (from: string, to: string) => (new Date(to).getTime() - new Date(from).getTime()) / 60_000
  return {
    seenToAction: firstEvent?.firstSeenAt ? minutes(firstEvent.firstSeenAt, firstEvent.at) : null,
    actionToBet: firstEvent && bet ? minutes(firstEvent.at, bet.placedAt) : null,
    oddsSlip: firstEvent?.shownOdds != null && bet ? Math.round((bet.odds - firstEvent.shownOdds) * 1000) / 1000 : null,
  }
}

export type ExecutionSummary = {
  days: number
  signals: number
  opened: number
  copied: number
  /** Signals with a first step that ended in a recorded bet on the same signal. */
  betAfterAction: number
  medianSeenToActionMin: number | null
  medianActionToBetMin: number | null
  medianOddsSlip: number | null
}

const median = (values: number[]) => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Site-wide summary for the owner, over the last `days`. */
export async function executionSummary(days = 30): Promise<ExecutionSummary> {
  await ensureAppSchema()
  const { rows } = await pool.query(
    `WITH first_step AS (
       SELECT DISTINCT ON ("userId", "signalId") "userId", "signalId", kind, "at", "firstSeenAt", "shownOdds"
       FROM execution_event
       WHERE "at" > NOW() - make_interval(days => $1)
       ORDER BY "userId", "signalId", "at"
     )
     SELECT f."signalId", f."at", f."firstSeenAt", f."shownOdds",
            (SELECT bool_or(kind = 'open_book') FROM execution_event e WHERE e."userId" = f."userId" AND e."signalId" = f."signalId") AS opened,
            (SELECT bool_or(kind = 'copy_event') FROM execution_event e WHERE e."userId" = f."userId" AND e."signalId" = f."signalId") AS copied,
            b."placedAt" AS "betAt", b.odds AS "betOdds"
     FROM first_step f
     LEFT JOIN LATERAL (
       SELECT "placedAt", odds FROM user_bet
       WHERE "userId" = f."userId" AND "signalId" = f."signalId" AND "placedAt" >= f."at"
       ORDER BY "placedAt" LIMIT 1
     ) b ON TRUE`,
    [days],
  )
  const timings = rows.map((row) =>
    executionTiming(
      { at: new Date(row.at).toISOString(), firstSeenAt: row.firstSeenAt ? new Date(row.firstSeenAt).toISOString() : null, shownOdds: row.shownOdds },
      row.betAt ? { placedAt: new Date(row.betAt).toISOString(), odds: Number(row.betOdds) } : null,
    ),
  )
  const pick = (key: keyof ExecutionTiming) => timings.map((t) => t[key]).filter((v): v is number => v !== null)
  return {
    days,
    signals: rows.length,
    opened: rows.filter((row) => row.opened).length,
    copied: rows.filter((row) => row.copied).length,
    betAfterAction: rows.filter((row) => row.betAt).length,
    medianSeenToActionMin: median(pick('seenToAction')),
    medianActionToBetMin: median(pick('actionToBet')),
    medianOddsSlip: median(pick('oddsSlip')),
  }
}
