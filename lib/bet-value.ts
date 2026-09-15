import { vilniusDay } from '@/lib/bets-calendar'
import type { ActiveBet } from '@/lib/types'

/**
 * Value, luck and closing-line numbers for tracked bets.
 *
 * Value is what a bet's price was worth: stake × (odds × fair probability − 1).
 * The fair probability is Pinnacle's at the close when we have it, otherwise
 * Pinnacle's when the bet was marked. Luck is the result minus the value.
 */

export type Period = 'week' | 'month' | 'all'
export type ClvFilter = 'all' | 'plus' | 'minus' | 'with' | 'without'

type ValueBet = Pick<ActiveBet, 'status' | 'stake' | 'odds' | 'profit' | 'startsAt' | 'placedAtIso' | 'entryFairProb' | 'closingFairProb'>

const DAY_MS = 86_400_000
const SETTLED = new Set(['laimeta', 'pralaimeta', 'grazinta'])

export const isSettled = (bet: Pick<ActiveBet, 'status' | 'profit'>) => SETTLED.has(bet.status) && bet.profit !== null

/** Kickoff when known, otherwise when the bet was marked. */
export const betTime = (bet: Pick<ActiveBet, 'startsAt' | 'placedAtIso'>) => bet.startsAt ?? bet.placedAtIso ?? null

/** Closing line value: the price against Pinnacle's fair price at the close. */
export function closingValue(bet: Pick<ActiveBet, 'odds' | 'closingFairProb'>): number | null {
  return bet.closingFairProb ? bet.odds * bet.closingFairProb - 1 : null
}

export function fairProbability(bet: Pick<ActiveBet, 'entryFairProb' | 'closingFairProb'>): number | null {
  return bet.closingFairProb ?? bet.entryFairProb ?? null
}

export function inPeriod(bet: Pick<ActiveBet, 'startsAt' | 'placedAtIso'>, period: Period, now: Date): boolean {
  if (period === 'all') return true
  const time = betTime(bet)
  if (!time) return false
  if (period === 'month') return vilniusDay(time).slice(0, 7) === vilniusDay(now).slice(0, 7)
  return new Date(time).getTime() > now.getTime() - 7 * DAY_MS
}

export function matchesClv(bet: Pick<ActiveBet, 'odds' | 'closingFairProb'>, filter: ClvFilter): boolean {
  const clv = closingValue(bet)
  if (filter === 'all') return true
  if (filter === 'with') return clv !== null
  if (filter === 'without') return clv === null
  if (clv === null) return false
  return filter === 'plus' ? clv > 0 : clv <= 0
}

const round2 = (value: number) => Math.round(value * 100) / 100

export type BetStats = {
  pending: number
  settled: number
  won: number
  lost: number
  pushed: number
  staked: number
  profit: number
  roi: number | null
  /** Sum of value over settled bets with a fair price. */
  value: number
  luck: number
  /** Settled bets valued at the closing price, at the entry price, and not at all. */
  valuedAtClose: number
  valuedAtEntry: number
  unvalued: number
  unvaluedProfit: number
  clvAverage: number | null
  clvMedian: number | null
  beatClose: number
  withClose: number
}

export function betStats(bets: ValueBet[]): BetStats {
  const stats: BetStats = {
    pending: 0,
    settled: 0,
    won: 0,
    lost: 0,
    pushed: 0,
    staked: 0,
    profit: 0,
    roi: null,
    value: 0,
    luck: 0,
    valuedAtClose: 0,
    valuedAtEntry: 0,
    unvalued: 0,
    unvaluedProfit: 0,
    clvAverage: null,
    clvMedian: null,
    beatClose: 0,
    withClose: 0,
  }
  const clvs: number[] = []

  for (const bet of bets) {
    const clv = closingValue(bet)
    if (clv !== null) {
      clvs.push(clv)
      stats.withClose += 1
      if (clv > 0) stats.beatClose += 1
    }
    if (bet.status === 'laukia') {
      stats.pending += 1
      continue
    }
    if (!isSettled(bet)) continue

    stats.settled += 1
    stats.staked += bet.stake
    stats.profit += bet.profit ?? 0
    if (bet.status === 'laimeta') stats.won += 1
    else if (bet.status === 'pralaimeta') stats.lost += 1
    else stats.pushed += 1

    const fair = fairProbability(bet)
    if (fair === null) {
      stats.unvalued += 1
      stats.unvaluedProfit += bet.profit ?? 0
    } else {
      stats.value += bet.stake * (bet.odds * fair - 1)
      if (bet.closingFairProb) stats.valuedAtClose += 1
      else stats.valuedAtEntry += 1
    }
  }

  stats.staked = round2(stats.staked)
  stats.profit = round2(stats.profit)
  stats.value = round2(stats.value)
  stats.luck = round2(stats.profit - stats.value)
  stats.unvaluedProfit = round2(stats.unvaluedProfit)
  stats.roi = stats.staked > 0 ? stats.profit / stats.staked : null
  if (clvs.length) {
    const sorted = [...clvs].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    stats.clvAverage = clvs.reduce((sum, clv) => sum + clv, 0) / clvs.length
    stats.clvMedian = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }
  return stats
}

export type ValuePoint = {
  /** Settled bets so far. */
  n: number
  result: number
  value: number
  /** Two standard deviations of the result around the value, from the bets' own odds. */
  spread: number
}

/**
 * Running result and value over settled bets in kickoff order, with the range
 * the result normally stays in. Each bet adds p(1 − p)(stake × odds)² of
 * variance, p being its fair probability; unpriced bets move only the result.
 */
export function valueSeries(bets: ValueBet[]): ValuePoint[] {
  const settled = bets
    .filter(isSettled)
    .sort((a, b) => new Date(betTime(a) ?? 0).getTime() - new Date(betTime(b) ?? 0).getTime())
  const points: ValuePoint[] = [{ n: 0, result: 0, value: 0, spread: 0 }]
  let result = 0
  let value = 0
  let variance = 0
  for (const bet of settled) {
    result += bet.profit ?? 0
    const fair = fairProbability(bet)
    if (fair !== null && bet.status !== 'grazinta') {
      value += bet.stake * (bet.odds * fair - 1)
      variance += fair * (1 - fair) * (bet.stake * bet.odds) ** 2
    }
    points.push({ n: points.length, result: round2(result), value: round2(value), spread: round2(2 * Math.sqrt(variance)) })
  }
  return points
}

/** Where the result sits against its normal range: below, inside or above. */
export function verdict(point: ValuePoint): 'below' | 'normal' | 'above' {
  if (point.result < point.value - point.spread) return 'below'
  if (point.result > point.value + point.spread) return 'above'
  return 'normal'
}
