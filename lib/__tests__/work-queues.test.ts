import { describe, expect, it } from 'vitest'
import { workQueues } from '@/lib/work-queues'
import type { ActiveBet } from '@/lib/types'

const NOW = new Date('2026-09-19T12:00:00.000Z')
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString()

const bet = (over: Partial<ActiveBet>): ActiveBet =>
  ({
    id: 'b', signalId: 's', sport: 'TENNIS', match: 'A vs B', betDescription: 'x', bookmaker: '7BET',
    odds: 2, stake: 10, status: 'laukia', placedAt: '', placedAtIso: hoursAgo(20), profit: null,
    marketType: 'moneyline', entryFairProb: null, closingFairProb: null, eventKey: null,
    settledAtIso: null, canonicalOutcome: null, ...over,
  }) as ActiveBet

describe('workQueues', () => {
  it('lists settled bets that never got a closing price', () => {
    const queues = workQueues([bet({ status: 'laimeta', profit: 10, closingFairProb: null }), bet({ status: 'laimeta', profit: 10, closingFairProb: 0.5 })], NOW)
    expect(queues.missingClose).toHaveLength(1)
  })

  it('lists bets still waiting long after kick-off', () => {
    const queues = workQueues([bet({ startsAt: hoursAgo(20) }), bet({ startsAt: hoursAgo(1) })], NOW)
    expect(queues.staleUnsettled).toHaveLength(1)
  })

  it('does not call a bet late when the kick-off is unknown', () => {
    expect(workQueues([bet({ startsAt: undefined })], NOW).staleUnsettled).toHaveLength(0)
  })

  it('leaves settled bets out of the waiting queue', () => {
    expect(workQueues([bet({ status: 'laimeta', profit: 5, startsAt: hoursAgo(40) })], NOW).staleUnsettled).toHaveLength(0)
  })
})
