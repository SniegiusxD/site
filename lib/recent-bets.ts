import { pool } from '@/lib/db'
import { ensureBetsSchema } from '@/lib/db/ensure-bets-schema'
import type { BoardBet } from '@/lib/exposure'

/**
 * Bets marked in the last two days or still waiting for a result: enough for
 * the board's daily target and same-match warnings. No settlement runs here,
 * so the board stays fast.
 */
export async function loadRecentBets(userId: string): Promise<BoardBet[]> {
  await ensureBetsSchema()
  const { rows } = await pool.query<{
    id: string
    signalId: string | null
    bookmaker: string
    stake: number
    odds: number
    entryFairProb: number | null
    eventKey: string | null
    placedAt: Date
  }>(
    `SELECT id, "signalId", bookmaker, stake, odds, "entryFairProb", "eventKey", "placedAt"
       FROM user_bet
      WHERE "userId" = $1 AND ("placedAt" > NOW() - INTERVAL '2 days' OR status = 'laukia')
      ORDER BY "placedAt" DESC
      LIMIT 500`,
    [userId],
  )
  return rows.map((row) => ({
    id: row.id,
    signalId: row.signalId,
    bookmaker: row.bookmaker,
    stake: Number(row.stake),
    odds: Number(row.odds),
    entryFairProb: row.entryFairProb === null ? null : Number(row.entryFairProb),
    eventKey: row.eventKey,
    placedAt: new Date(row.placedAt).toISOString(),
  }))
}
