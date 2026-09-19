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

describe('breakdown by value and by line', () => {
  const at = (odds: number, fair: number, over: Partial<ActiveBet> = {}) =>
    bet({ odds, entryFairProb: fair, stake: 10, profit: 5, ...over })

  it('files each bet in the value band it was recorded at', () => {
    // 2.00 at a 0.55 fair probability is a 10 % edge, at 0.505 it is 1 %, and
    // at 0.515 it is 3 %. A band's upper number belongs to the band above it.
    const rows = breakdown([at(2, 0.55), at(2, 0.505), at(2, 0.515)], 'edge')
    expect(rows.map((row) => row.label).sort()).toEqual(['2–4 %', 'iki 2 %', 'nuo 8 %'])
  })

  it('says a value is unknown rather than guessing it', () => {
    expect(breakdown([at(2, 0)], 'edge')[0].label).toBe('vertė nežinoma')
  })

  it('separates exact lines from interpolated ones, and old bets from both', () => {
    const rows = breakdown(
      [
        at(2, 0.55, { fairPriceInterpolated: true }),
        at(2, 0.55, { fairPriceInterpolated: false }),
        at(2, 0.55),
      ],
      'pricing',
    )
    expect(rows.map((row) => row.label).sort()).toEqual(['Interpoliuota linija', 'Nežinoma', 'Tiksli linija'])
  })
})
