import { describe, expect, it } from 'vitest'
import { breakdown } from '@/lib/breakdowns'
import type { ActiveBet } from '@/lib/types'

const bet = (over: Partial<ActiveBet>): ActiveBet =>
  ({
    id: 'b', signalId: 's', sport: 'TENNIS', match: 'A vs B', betDescription: 'x', bookmaker: '7BET',
    odds: 2, stake: 10, status: 'laimeta', placedAt: '', placedAtIso: '', profit: 10, marketType: 'moneyline',
    entryFairProb: 0.5, closingFairProb: null, eventKey: null, settledAtIso: null, canonicalOutcome: null, ...over,
  }) as ActiveBet

describe('breakdown', () => {
  it('ignores bets that have not settled', () => {
    expect(breakdown([bet({ profit: null, status: 'laukia' })], 'book')).toEqual([])
  })

  it('adds up profit and grąža per bookmaker', () => {
    const rows = breakdown(
      [bet({ bookmaker: '7BET', stake: 10, profit: 10 }), bet({ bookmaker: '7BET', stake: 10, profit: -10 }), bet({ bookmaker: 'Betsson' as ActiveBet['bookmaker'], stake: 20, profit: 5 })],
      'book',
    )
    const seven = rows.find((row) => row.label === '7BET')!
    expect(seven.settled).toBe(2)
    expect(seven.staked).toBe(20)
    expect(seven.profit).toBe(0)
    expect(seven.roi).toBe(0)
    expect(rows.find((row) => row.label === 'Betsson')!.roi).toBeCloseTo(0.25)
  })

  it('groups markets into their families', () => {
    const rows = breakdown([bet({ marketType: 'total' }), bet({ marketType: 'total_1h' }), bet({ marketType: 'moneyline' })], 'market')
    expect(rows.find((row) => row.label === 'Suminis')!.settled).toBe(2)
    expect(rows.find((row) => row.label === 'Nugalėtojas')!.settled).toBe(1)
  })

  it('leaves CLV null until a closing price exists', () => {
    const rows = breakdown([bet({ closingFairProb: null })], 'book')
    expect(rows[0].clv).toBeNull()
  })

  it('files both corner markets under one family', () => {
    // Round 20 on the VM publishes corner_team_total beside corner_total;
    // neither should fall through to "Kita".
    const rows = breakdown(
      [bet({ marketType: 'corner_total' }), bet({ marketType: 'corner_team_total' })],
      'market',
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].label).toBe('Kampiniai')
    expect(rows[0].settled).toBe(2)
  })

  it('names sports in Lithuanian', () => {
    expect(breakdown([bet({ sport: 'BASKETBALL' })], 'sport')[0].label).toBe('Krepšinis')
  })
})
