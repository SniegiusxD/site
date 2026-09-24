import { describe, expect, it } from 'vitest'
import { recapFrom } from '@/lib/trial-recap'

describe('recapFrom', () => {
  const window = { startedAt: '2026-09-10T00:00:00.000Z', endedAt: '2026-09-17T00:00:00.000Z' }
  it('sums stakes, expected value from the fair price, and settled profit only', () => {
    const recap = recapFrom(window, [
      { stake: 10, odds: 2.1, entryFairProb: 0.5, profit: 11 },
      { stake: 20, odds: 1.8, entryFairProb: 0.58, profit: null },
      { stake: 5, odds: 3, entryFairProb: null, profit: -5 },
    ])
    expect(recap).toEqual({ ...window, bets: 3, staked: 35, expectedValue: 1.38, settled: 2, profit: 6 })
  })

  it('is all zeros for a trial without bets', () => {
    expect(recapFrom(window, [])).toMatchObject({ bets: 0, staked: 0, expectedValue: 0, settled: 0, profit: 0 })
  })
})
