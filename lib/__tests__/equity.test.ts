import { describe, expect, it } from 'vitest'
import { equityCurve } from '@/lib/equity'
import type { ActiveBet } from '@/lib/types'

let clock = Date.parse('2026-09-01T00:00:00.000Z')
const bet = (profit: number | null): ActiveBet => {
  clock += 3_600_000
  return {
    id: String(clock), signalId: 's', sport: 'TENNIS', match: 'A vs B', betDescription: 'x', bookmaker: '7BET',
    odds: 2, stake: 10, status: profit === null ? 'laukia' : profit > 0 ? 'laimeta' : 'pralaimeta',
    placedAt: '', placedAtIso: new Date(clock).toISOString(), settledAtIso: new Date(clock).toISOString(),
    profit, marketType: 'moneyline', entryFairProb: null, closingFairProb: null, eventKey: null, canonicalOutcome: null,
  } as ActiveBet
}

describe('equityCurve', () => {
  it('ignores bets that have not settled', () => {
    expect(equityCurve([bet(null)]).points).toHaveLength(0)
  })

  it('follows the running total', () => {
    const curve = equityCurve([bet(10), bet(-4), bet(6)])
    expect(curve.points.map((point) => point.equity)).toEqual([10, 6, 12])
    expect(curve.final).toBe(12)
    expect(curve.peak).toBe(12)
  })

  it('measures the deepest fall below a peak, not below zero', () => {
    // +20, then −5 and −5: the low is 10 below a peak of 20, not below zero.
    const curve = equityCurve([bet(20), bet(-5), bet(-5)])
    expect(curve.maxDrawdown).toBe(-10)
    expect(curve.maxDrawdownShare).toBeCloseTo(-0.5)
  })

  it('counts how many bets it took to regain the peak, or null while still below', () => {
    expect(equityCurve([bet(20), bet(-10), bet(10)]).recoveryBets).toBe(1)
    expect(equityCurve([bet(20), bet(-10)]).recoveryBets).toBeNull()
  })

  it('finds the longest run of losses', () => {
    expect(equityCurve([bet(5), bet(-1), bet(-1), bet(-1), bet(4), bet(-1)]).longestLosingRun).toBe(3)
  })
})
