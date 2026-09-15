import { describe, expect, it } from 'vitest'
import { type BoardBet, type Exposure, boardStake, dailyProgress, exposureFor } from '@/lib/exposure'
import type { LiveSignal } from '@/lib/live-signals'

function signal(overrides: Partial<LiveSignal> = {}): LiveSignal {
  return {
    id: 'ls_1',
    sport: 'basketball',
    startsAt: '2026-09-14T18:45:00Z',
    market: 'spread',
    direction: 'home',
    line: -16.5,
    fairProb: 0.4073,
    fairOdds: 1 / 0.4073,
    pinnacleOdds: 2.22,
    home: 'Rio Breogan',
    away: 'Rilski Sportist',
    bestBook: 'TopSport',
    bestOdds: 2.49,
    bestEdge: 0.0142,
    status: 'open',
    firstSeenAt: '2026-09-14T15:16:00Z',
    lastSeenAt: '2026-09-14T15:47:00Z',
    closedAt: null,
    eventKey: '1636213222',
    closingFairProb: null,
    prices: [],
    ...overrides,
  }
}

function bet(overrides: Partial<BoardBet> = {}): BoardBet {
  return {
    id: 'b1',
    signalId: 'ls_1',
    bookmaker: 'TopSport',
    stake: 6,
    odds: 2.49,
    entryFairProb: 0.4073,
    eventKey: '1636213222',
    placedAt: '2026-09-14T08:00:00Z',
    ...overrides,
  }
}

describe('dailyProgress', () => {
  it('counts bets since Vilnius midnight and sums value at entry', () => {
    const now = new Date('2026-09-14T20:00:00Z') // 23:00 in Vilnius
    const progress = dailyProgress(
      [
        bet(), // 11:00 today
        bet({ id: 'b2', placedAt: '2026-09-13T21:30:00Z' }), // 00:30 today
        bet({ id: 'b3', placedAt: '2026-09-13T20:30:00Z' }), // 23:30 yesterday
        bet({ id: 'b4', entryFairProb: null }), // older bet without a fair price
      ],
      now,
    )
    expect(progress.count).toBe(3)
    expect(progress.staked).toBe(18)
    // 6 × (2.49 × 0.4073 − 1) ≈ 0.085 for each of the two bets with a fair price.
    expect(progress.value).toBeCloseTo(0.17, 2)
  })
})

describe('exposureFor', () => {
  it('splits this selection from other lines of the same match', () => {
    const spread = signal()
    const total = signal({ id: 'ls_2', market: 'total', direction: 'over', line: 171.5 })
    const other = signal({ id: 'ls_3', eventKey: '999', home: 'Promitheas', away: 'Vienna' })
    const byId = new Map([spread, total, other].map((s) => [s.id, s]))
    const bets = [
      bet(),
      bet({ id: 'b2', bookmaker: 'Betsson', stake: 4 }),
      bet({ id: 'b3', signalId: 'ls_2', stake: 5 }),
      bet({ id: 'b4', signalId: 'ls_3', eventKey: '999' }),
    ]
    expect(exposureFor(spread, bets, byId)).toEqual({ selection: { count: 2, staked: 10 }, match: { count: 1, staked: 5 } })
  })

  it('falls back to names and kickoff when match keys are missing', () => {
    const spread = signal({ eventKey: null })
    const total = signal({ id: 'ls_2', eventKey: null, market: 'total' })
    const byId = new Map([spread, total].map((s) => [s.id, s]))
    expect(exposureFor(spread, [bet({ signalId: 'ls_2', eventKey: null })], byId).match.count).toBe(1)
    // A keyless bet whose signal already left the board cannot be matched.
    expect(exposureFor(spread, [bet({ signalId: 'gone', eventKey: null })], byId).match.count).toBe(0)
  })

  it('does not join different matches that share a kickoff', () => {
    const spread = signal()
    const other = signal({ id: 'ls_9', eventKey: '777', home: 'Gran Canaria', away: 'Unicaja' })
    const byId = new Map([spread, other].map((s) => [s.id, s]))
    expect(exposureFor(spread, [bet({ signalId: 'ls_9', eventKey: '777' })], byId).match.count).toBe(0)
  })
})

describe('boardStake', () => {
  const prefs = { bankroll: 500, kellyFraction: 0.25, bookLimits: { TopSport: 3 } }
  const none: Exposure = { selection: { count: 0, staked: 0 }, match: { count: 0, staked: 0 } }
  const price = { book: 'Betsson' as const, odds: 1.95 }
  const fair = { fairOdds: 1.845 }

  it('suggests quarter Kelly, capped by the book limit', () => {
    expect(boardStake(prefs, fair, price, none)).toEqual({ kelly: 7, remaining: 7, suggested: 7, directionFull: false })
    expect(boardStake(prefs, fair, { ...price, book: 'TopSport' }, none).suggested).toBe(3)
  })

  it('only offers what is left of the Kelly amount on a selection already bet', () => {
    expect(boardStake(prefs, fair, price, { ...none, selection: { count: 1, staked: 5 } })).toMatchObject({ suggested: 2, remaining: 2 })
    expect(boardStake(prefs, fair, price, { ...none, selection: { count: 1, staked: 7 } })).toMatchObject({
      suggested: 0,
      directionFull: true,
    })
  })
})
