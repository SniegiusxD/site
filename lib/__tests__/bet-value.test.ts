import { describe, expect, it } from 'vitest'
import { betStats, closingValue, inPeriod, matchesClv, valueSeries, verdict } from '@/lib/bet-value'
import type { ActiveBet } from '@/lib/types'

function bet(overrides: Partial<ActiveBet> = {}): ActiveBet {
  return {
    id: 'b1',
    signalId: 'ls_1',
    sport: 'BASKETBALL',
    match: 'Rio Breogan vs Rilski Sportist',
    betDescription: 'Handikapas: Rio Breogan -16.5',
    bookmaker: '7BET',
    odds: 2.0,
    stake: 10,
    status: 'laimeta',
    placedAt: 'prieš 2 val',
    placedAtIso: '2026-09-14T10:00:00Z',
    profit: 10,
    marketType: 'spread',
    startsAt: '2026-09-14T18:00:00Z',
    entryFairProb: 0.52,
    closingFairProb: null,
    eventKey: null,
    ...overrides,
  }
}

describe('closing value', () => {
  it('compares the price with the fair price at the close', () => {
    expect(closingValue(bet({ closingFairProb: 0.55 }))).toBeCloseTo(0.1)
    expect(closingValue(bet())).toBeNull()
  })

  it('filters by closing value', () => {
    const plus = bet({ closingFairProb: 0.55 })
    const minus = bet({ closingFairProb: 0.45 })
    const none = bet()
    expect([plus, minus, none].map((b) => matchesClv(b, 'plus'))).toEqual([true, false, false])
    expect([plus, minus, none].map((b) => matchesClv(b, 'minus'))).toEqual([false, true, false])
    expect([plus, minus, none].map((b) => matchesClv(b, 'without'))).toEqual([false, false, true])
  })
})

describe('betStats', () => {
  it('splits the result into value and luck', () => {
    const stats = betStats([
      // Won 10 € at 2,00; fair at close 0.55 → value 10 × 0.10 = 1 €.
      bet({ closingFairProb: 0.55 }),
      // Lost 10 € at 2,00; no close, entry fair 0.52 → value 0.40 €.
      bet({ id: 'b2', status: 'pralaimeta', profit: -10 }),
      // Won 5 € on an old bet without any fair price.
      bet({ id: 'b3', stake: 5, profit: 5, entryFairProb: null }),
      bet({ id: 'b4', status: 'laukia', profit: null, closingFairProb: 0.48 }),
    ])
    expect(stats).toMatchObject({ settled: 3, pending: 1, won: 2, lost: 1, pushed: 0, staked: 25, profit: 5 })
    expect(stats.value).toBe(1.4)
    expect(stats.luck).toBe(3.6)
    expect(stats).toMatchObject({ valuedAtClose: 1, valuedAtEntry: 1, unvalued: 1, unvaluedProfit: 5 })
    expect(stats.roi).toBeCloseTo(0.2)
    // CLV counts every bet with a close, pending ones too: +10 % and −4 %.
    expect(stats.withClose).toBe(2)
    expect(stats.beatClose).toBe(1)
    expect(stats.clvAverage).toBeCloseTo(0.03)
    expect(stats.clvMedian).toBeCloseTo(0.03)
  })

  it('has no ROI or CLV without data', () => {
    expect(betStats([])).toMatchObject({ roi: null, clvAverage: null, clvMedian: null, value: 0, luck: 0 })
  })
})

describe('valueSeries', () => {
  it('runs in kickoff order and widens the normal range with each priced bet', () => {
    const series = valueSeries([
      bet({ id: 'late', startsAt: '2026-09-15T18:00:00Z', status: 'pralaimeta', profit: -10 }),
      bet({ id: 'early' }),
      bet({ id: 'push', startsAt: '2026-09-16T18:00:00Z', status: 'grazinta', profit: 0 }),
    ])
    expect(series.map((p) => p.result)).toEqual([0, 10, 0, 0])
    expect(series[2].value).toBe(0.8)
    // Two bets at 2,00 with p = 0.52: 2 × sqrt(2 × 0.2496 × 400) ≈ 28.26; a push adds nothing.
    expect(series[2].spread).toBeCloseTo(28.26, 1)
    expect(series[3].spread).toBe(series[2].spread)
    expect(verdict(series[3])).toBe('normal')
    expect(verdict({ n: 1, result: -40, value: 1, spread: 20 })).toBe('below')
  })
})

describe('inPeriod', () => {
  const now = new Date('2026-09-15T12:00:00Z')
  it('uses the Vilnius calendar month and a rolling week', () => {
    expect(inPeriod(bet({ startsAt: '2026-08-31T21:30:00Z' }), 'month', now)).toBe(true) // 00:30 on 1 September in Vilnius
    expect(inPeriod(bet({ startsAt: '2026-08-31T20:30:00Z' }), 'month', now)).toBe(false)
    expect(inPeriod(bet({ startsAt: '2026-09-09T12:00:00Z' }), 'week', now)).toBe(true)
    expect(inPeriod(bet({ startsAt: '2026-09-08T11:00:00Z' }), 'week', now)).toBe(false)
    expect(inPeriod(bet({ startsAt: undefined, placedAtIso: undefined }), 'all', now)).toBe(true)
  })
})
