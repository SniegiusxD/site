import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'

/**
 * What a member did during their 7 free days, from their own bets: shown once
 * the trial is over, beside the offer to keep going. Honest numbers only —
 * expected value is computed from the fair price at the moment of each bet,
 * profit only from bets already settled.
 */
export type TrialRecap = {
  startedAt: string
  endedAt: string
  bets: number
  staked: number
  /** Sum of stake × (odds × fair probability − 1) over bets with a fair price. */
  expectedValue: number
  settled: number
  profit: number
}

export function recapFrom(
  window: { startedAt: string; endedAt: string },
  rows: Array<{ stake: number; odds: number; entryFairProb: number | null; profit: number | null }>,
): TrialRecap {
  let staked = 0
  let expectedValue = 0
  let settled = 0
  let profit = 0
  for (const row of rows) {
    staked += row.stake
    if (row.entryFairProb !== null) expectedValue += row.stake * (row.odds * row.entryFairProb - 1)
    if (row.profit !== null) {
      settled += 1
      profit += row.profit
    }
  }
  const round = (value: number) => Math.round(value * 100) / 100
  return { ...window, bets: rows.length, staked: round(staked), expectedValue: round(expectedValue), settled, profit: round(profit) }
}

/** Null when the member never started a trial, or it has not ended yet. */
export async function loadTrialRecap(userId: string, now: Date = new Date()): Promise<TrialRecap | null> {
  await ensureAppSchema()
  const { rows: subs } = await pool.query(
    `SELECT "trialStartedAt", "trialEndsAt" FROM subscription WHERE "userId" = $1`,
    [userId],
  )
  const sub = subs[0]
  if (!sub?.trialStartedAt || !sub.trialEndsAt || new Date(sub.trialEndsAt) > now) return null
  const { rows } = await pool.query(
    `SELECT stake, odds, "entryFairProb", profit FROM user_bet
      WHERE "userId" = $1 AND "placedAt" >= $2 AND "placedAt" < $3 AND placement <> 'rejected'`,
    [userId, sub.trialStartedAt, sub.trialEndsAt],
  )
  return recapFrom(
    { startedAt: new Date(sub.trialStartedAt).toISOString(), endedAt: new Date(sub.trialEndsAt).toISOString() },
    rows.map((row) => ({ stake: Number(row.stake), odds: Number(row.odds), entryFairProb: row.entryFairProb === null ? null : Number(row.entryFairProb), profit: row.profit === null ? null : Number(row.profit) })),
  )
}
