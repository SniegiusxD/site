import type { ActiveBet } from '@/lib/types'

/**
 * Bets that need a human look: a settled bet whose closing price never
 * arrived (so it has no CLV), and a bet still waiting long after its match
 * should have finished. Naming them is more honest than letting them quietly
 * dilute the averages.
 */
export type WorkQueues = {
  missingClose: ActiveBet[]
  staleUnsettled: ActiveBet[]
}

/** A match this far past its kick-off should have been graded by now. */
export const STALE_AFTER_HOURS = 8

export function workQueues(bets: ActiveBet[], now: Date = new Date()): WorkQueues {
  const cutoff = now.getTime() - STALE_AFTER_HOURS * 3_600_000

  return {
    missingClose: bets.filter((bet) => bet.profit !== null && (bet.closingFairProb === null || bet.closingFairProb === undefined)),
    staleUnsettled: bets.filter((bet) => {
      if (bet.status !== 'laukia') return false
      const start = bet.startsAt ? Date.parse(bet.startsAt) : Number.NaN
      // Without a kick-off we cannot say it is late, so we do not claim it is.
      return Number.isFinite(start) && start < cutoff
    }),
  }
}
