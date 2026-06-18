import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { userBet } from '@/lib/db/schema'
import { tryGradeBet } from '@/lib/bet-grader'

/**
 * Backend settlement (#40). Grades pending user_bet rows from public score
 * sources (ESPN via bet-grader; later friend's results scraper #39). Designed to
 * run from a VPS cron hitting /api/cron/settle — NOT dependent on a user opening
 * the app. No paid APIs, no customer self-report.
 *
 * Rows still pending >24h after kickoff with no resolvable score become
 * `neisspresta` (unresolved) and are logged for an admin alert — they never
 * silently stay `laukia` forever, and customers never grade them by hand.
 */

const UNRESOLVED_AFTER_MS = 24 * 60 * 60 * 1000

export type SettleSummary = {
  scanned: number
  graded: number
  unresolved: number
  stillPending: number
  unresolvedBets: Array<{ id: string; sport: string; match: string; marketType: string }>
}

export async function settlePendingBets(opts?: { userId?: string }): Promise<SettleSummary> {
  const where = opts?.userId
    ? and(eq(userBet.status, 'laukia'), eq(userBet.userId, opts.userId))
    : eq(userBet.status, 'laukia')

  const pending = await db.select().from(userBet).where(where)

  const summary: SettleSummary = {
    scanned: pending.length,
    graded: 0,
    unresolved: 0,
    stillPending: 0,
    unresolvedBets: [],
  }

  const now = Date.now()

  for (const row of pending) {
    const result = await tryGradeBet({
      id: row.id,
      sport: row.sport,
      match: row.match,
      betDescription: row.betDescription,
      marketType: row.marketType,
      pickName: row.pickName,
      line: row.line,
      homeName: row.homeName,
      awayName: row.awayName,
      startsAt: row.startsAt,
      stake: row.stake,
      odds: row.odds,
    })

    if (result) {
      await db
        .update(userBet)
        .set({ status: result.status, profit: result.profit, settledAt: new Date() })
        .where(eq(userBet.id, row.id))
      summary.graded += 1
      continue
    }

    // Not gradable yet. If well past kickoff, mark unresolved (no manual grade).
    const start = row.startsAt ? row.startsAt.getTime() : null
    if (start != null && now > start + UNRESOLVED_AFTER_MS) {
      await db
        .update(userBet)
        .set({ status: 'neisspresta', profit: 0, settledAt: new Date() })
        .where(eq(userBet.id, row.id))
      summary.unresolved += 1
      summary.unresolvedBets.push({
        id: row.id,
        sport: row.sport,
        match: row.match,
        marketType: row.marketType,
      })
    } else {
      summary.stillPending += 1
    }
  }

  if (summary.unresolved > 0) {
    // Admin alert: surfaced in cron logs (journalctl) — NOT shown to customers.
    console.warn(
      `[settle] ${summary.unresolved} bets unresolved >24h (need score source / friend #39):`,
      summary.unresolvedBets.map((b) => `${b.sport}:${b.match} (${b.marketType})`).join(' | '),
    )
  }

  return summary
}
