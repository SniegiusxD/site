import { describe, expect, it } from 'vitest'
import { executionStats } from '@/lib/execution'
import type { ActiveBet } from '@/lib/types'

const bet = (over: Partial<ActiveBet>): ActiveBet =>
  ({
    id: 'b', signalId: 's', sport: 'TENNIS', match: 'A vs B', betDescription: 'x',
    bookmaker: '7BET', odds: 2, stake: 10, status: 'laukia', placedAt: '', placedAtIso: '',
    profit: null, marketType: 'moneyline', entryFairProb: null, closingFairProb: null,
    eventKey: null, settledAtIso: null, canonicalOutcome: null, ...over,
  }) as ActiveBet

describe('executionStats', () => {
  it('ignores bets recorded before the displayed price was stored', () => {
    const stats = executionStats([bet({ odds: 2, shownOdds: null })])
    expect(stats.recorded).toBe(0)
    expect(stats.averageSlippage).toBeNull()
  })

  it('counts a worse price as negative slippage', () => {
    const stats = executionStats([bet({ odds: 1.9, shownOdds: 2 })])
    expect(stats.recorded).toBe(1)
    expect(stats.differed).toBe(1)
    expect(stats.averageSlippage).toBeCloseTo(-0.05)
  })

  it('treats an unchanged price as no difference', () => {
    const stats = executionStats([bet({ odds: 2, shownOdds: 2 })])
    expect(stats.differed).toBe(0)
    expect(stats.averageSlippage).toBeCloseTo(0)
  })

  it('counts limited and rejected placements and the median delay', () => {
    const stats = executionStats([
      bet({ odds: 2, shownOdds: 2, placement: 'limited', delaySeconds: 60 }),
      bet({ odds: 2, shownOdds: 2, placement: 'rejected', delaySeconds: 600 }),
      bet({ odds: 2, shownOdds: 2, delaySeconds: 1800 }),
    ])
    expect(stats.limited).toBe(1)
    expect(stats.rejected).toBe(1)
    expect(stats.medianDelayMinutes).toBe(10)
  })
})
