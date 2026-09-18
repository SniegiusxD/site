import type { ActiveBet } from '@/lib/types'

/**
 * Execution quality: the gap between the price we put on screen and the price
 * the bookmaker actually gave. Until this existed, every personal number was
 * really a statement about our own board.
 */
export type ExecutionStats = {
  /** Bets recorded since the site started storing the displayed price. */
  recorded: number
  /** Taken at a different price than the one shown. */
  differed: number
  /** Taken at a smaller stake than suggested. */
  limited: number
  rejected: number
  /** Mean (accepted / shown − 1), as a fraction. Negative means worse than shown. */
  averageSlippage: number | null
  /** Typical minutes between the capture we showed and the bet being recorded. */
  medianDelayMinutes: number | null
}

const EPSILON = 0.0005

export function executionStats(bets: ActiveBet[]): ExecutionStats {
  const stats: ExecutionStats = {
    recorded: 0,
    differed: 0,
    limited: 0,
    rejected: 0,
    averageSlippage: null,
    medianDelayMinutes: null,
  }

  const slips: number[] = []
  const delays: number[] = []

  for (const bet of bets) {
    if (bet.placement === 'rejected') stats.rejected += 1
    if (bet.placement === 'limited') stats.limited += 1
    if (typeof bet.delaySeconds === 'number') delays.push(bet.delaySeconds)

    const shown = bet.shownOdds
    // Bets from before this was recorded have nothing to compare against.
    if (typeof shown !== 'number' || shown <= 1) continue
    stats.recorded += 1
    const slip = bet.odds / shown - 1
    if (Math.abs(slip) > EPSILON) stats.differed += 1
    slips.push(slip)
  }

  if (slips.length) stats.averageSlippage = slips.reduce((sum, value) => sum + value, 0) / slips.length
  if (delays.length) {
    const sorted = [...delays].sort((a, b) => a - b)
    const middle = sorted[Math.floor((sorted.length - 1) / 2)]
    stats.medianDelayMinutes = Math.round(middle / 60)
  }
  return stats
}
