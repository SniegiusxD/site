import type { ActiveBet } from '@/lib/types'

/**
 * The bankroll curve of settled bets, and how far below its own peak it went.
 * A member who only sees a final profit has no idea what they had to sit
 * through to get it; drawdown is the part that makes people quit.
 */
export type EquityPoint = {
  /** 1-based bet number in settled order. */
  index: number
  at: string
  profit: number
  /** Cumulative profit after this bet. */
  equity: number
  /** Distance below the highest equity so far, as a negative number or 0. */
  drawdown: number
}

export type EquityStats = {
  points: EquityPoint[]
  peak: number
  final: number
  /** Deepest distance below a peak, in euro (0 or negative). */
  maxDrawdown: number
  /** Where that low sat, as a share of the peak. Null when the peak was never positive. */
  maxDrawdownShare: number | null
  /** Bets from the deepest low until the peak was regained; null if still below. */
  recoveryBets: number | null
  longestLosingRun: number
}

const timeOf = (bet: ActiveBet) => Date.parse(bet.settledAtIso ?? bet.placedAtIso ?? '') || 0

export function equityCurve(bets: ActiveBet[]): EquityStats {
  const settled = bets.filter((bet) => bet.profit !== null).sort((a, b) => timeOf(a) - timeOf(b))

  const points: EquityPoint[] = []
  let equity = 0
  let peak = 0
  let maxDrawdown = 0
  let peakAtMaxDrawdown = 0
  let deepestIndex = -1
  let losing = 0
  let longestLosingRun = 0

  settled.forEach((bet, position) => {
    const profit = bet.profit as number
    equity += profit
    peak = Math.max(peak, equity)
    const drawdown = equity - peak
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown
      peakAtMaxDrawdown = peak
      deepestIndex = position
    }
    losing = profit < 0 ? losing + 1 : 0
    longestLosingRun = Math.max(longestLosingRun, losing)
    points.push({
      index: position + 1,
      at: bet.settledAtIso ?? bet.placedAtIso ?? '',
      profit,
      equity,
      drawdown,
    })
  })

  // How long it took to climb back to the old peak, counted in bets.
  let recoveryBets: number | null = null
  if (deepestIndex >= 0) {
    const regained = points.findIndex((point, position) => position > deepestIndex && point.equity >= peakAtMaxDrawdown)
    recoveryBets = regained === -1 ? null : regained - deepestIndex
  }

  return {
    points,
    peak,
    final: equity,
    maxDrawdown,
    maxDrawdownShare: peakAtMaxDrawdown > 0 ? maxDrawdown / peakAtMaxDrawdown : null,
    recoveryBets,
    longestLosingRun,
  }
}
