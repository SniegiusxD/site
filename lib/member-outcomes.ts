import type { PoolClient } from 'pg'
import type { BetStatus } from '@/lib/types'

/**
 * Canonical member outcomes from the aggregator (contract:
 * aggregator/planning/SITE_MEMBER_OUTCOMES_CONTRACT_2026-09-15.md).
 *
 * The VM writes `signal_result` (the settlement ledger's final grade under the
 * exact market contract) and `signal_closing_price` (Pinnacle's last valid
 * pre-start fair price) keyed by the signal id a member tracked. When a result
 * exists, it wins over the site's own name-matching grader, including bets that
 * grader already settled. Half outcomes are kept separately because the
 * Lithuanian status alone cannot tell a half win from a win.
 */

export const CANONICAL_OUTCOMES = ['won', 'half_won', 'push', 'void', 'half_lost', 'lost'] as const
export type CanonicalOutcome = (typeof CANONICAL_OUTCOMES)[number]

export const isCanonicalOutcome = (value: unknown): value is CanonicalOutcome =>
  typeof value === 'string' && (CANONICAL_OUTCOMES as readonly string[]).includes(value)

/** Profit at the member's own odds and stake, exactly as the contract's SQL computes it. */
export function canonicalProfit(outcome: CanonicalOutcome, stake: number, odds: number): number {
  switch (outcome) {
    case 'won':
      return stake * (odds - 1)
    case 'half_won':
      return (stake * (odds - 1)) / 2
    case 'push':
    case 'void':
      return 0
    case 'half_lost':
      return -stake / 2
    case 'lost':
      return -stake
  }
}

/** The display status the rest of the site understands. */
export function displayStatus(outcome: CanonicalOutcome): BetStatus {
  if (outcome === 'won' || outcome === 'half_won') return 'laimeta'
  if (outcome === 'lost' || outcome === 'half_lost') return 'pralaimeta'
  return 'grazinta'
}

export const OUTCOME_LABEL: Record<CanonicalOutcome, string> = {
  won: 'Laimėta',
  half_won: 'Pusiau laimėta',
  push: 'Grąžinta',
  void: 'Anuliuota',
  half_lost: 'Pusiau pralaimėta',
  lost: 'Pralaimėta',
}

type Queryable = Pick<PoolClient, 'query'>

// $1 is a user id, or NULL for every member (the settlement cron).
export const RESULTS_SQL = `
UPDATE user_bet ub
   SET "canonicalOutcome" = sr.outcome,
       status = CASE WHEN sr.outcome IN ('won', 'half_won') THEN 'laimeta'
                     WHEN sr.outcome IN ('lost', 'half_lost') THEN 'pralaimeta'
                     ELSE 'grazinta' END,
       profit = CASE sr.outcome
                  WHEN 'won' THEN ub.stake * (ub.odds - 1)
                  WHEN 'half_won' THEN ub.stake * (ub.odds - 1) / 2
                  WHEN 'half_lost' THEN -ub.stake / 2
                  WHEN 'lost' THEN -ub.stake
                  ELSE 0 END,
       "homeScore" = sr.home_score,
       "awayScore" = sr.away_score,
       "resultSource" = sr.result_source,
       "settledAt" = COALESCE(sr.graded_at, ub."settledAt", NOW())
  FROM signal_result sr
 WHERE sr.signal_id = ub."signalId"
   AND ($1::text IS NULL OR ub."userId" = $1::text)
   AND sr.outcome IN ('won', 'half_won', 'push', 'void', 'half_lost', 'lost')
   AND (ub."canonicalOutcome" IS DISTINCT FROM sr.outcome
        OR ub."homeScore" IS DISTINCT FROM sr.home_score
        OR ub."awayScore" IS DISTINCT FROM sr.away_score
        OR ub."resultSource" IS DISTINCT FROM sr.result_source)`

export const CLOSINGS_SQL = `
UPDATE user_bet ub
   SET "closingFairProb" = scp.closing_fair_prob,
       "closingCapturedAt" = scp.closing_captured_at
  FROM signal_closing_price scp
 WHERE scp.signal_id = ub."signalId"
   AND ($1::text IS NULL OR ub."userId" = $1::text)
   -- Since Round 23 the VM publishes a row for every signal, with a NULL price
   -- when no exact close was captured. Missing evidence must never erase a
   -- close the bet already has.
   AND scp.closing_fair_prob IS NOT NULL
   AND (ub."closingFairProb" IS DISTINCT FROM scp.closing_fair_prob
        OR ub."closingCapturedAt" IS DISTINCT FROM scp.closing_captured_at)`

export type MemberOutcomeSync = {
  /** False while the VM release has not created the tables yet. */
  resultsAvailable: boolean
  closingsAvailable: boolean
  resultsUpdated: number
  closingsUpdated: number
}

const UNDEFINED_TABLE = '42P01'

/**
 * Copies canonical results and closing prices onto member bets. Writes only
 * rows whose values differ, so repeated calls are cheap no-ops. Missing tables
 * (before the aggregator release) are not an error: the site's own grader keeps
 * working as before.
 */
export async function applyMemberOutcomes(q: Queryable, userId: string | null): Promise<MemberOutcomeSync> {
  const sync: MemberOutcomeSync = { resultsAvailable: true, closingsAvailable: true, resultsUpdated: 0, closingsUpdated: 0 }
  try {
    sync.resultsUpdated = (await q.query(RESULTS_SQL, [userId])).rowCount ?? 0
  } catch (error) {
    if ((error as { code?: string }).code !== UNDEFINED_TABLE) throw error
    sync.resultsAvailable = false
  }
  try {
    sync.closingsUpdated = (await q.query(CLOSINGS_SQL, [userId])).rowCount ?? 0
  } catch (error) {
    if ((error as { code?: string }).code !== UNDEFINED_TABLE) throw error
    sync.closingsAvailable = false
  }
  return sync
}
