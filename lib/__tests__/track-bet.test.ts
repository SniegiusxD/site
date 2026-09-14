import { describe, expect, it } from 'vitest'
import type { LivePrice, LiveSignal } from '@/lib/live-signals'
import { betPayload } from '@/lib/track-bet'

const price: LivePrice = {
  book: 'Betsson',
  odds: 2.1,
  edge: 0.02,
  published: true,
  eventName: 'Breogan Lugo – Rilski Sportist',
  selectionLabel: 'Handikapas: Breogan Lugo -16.5',
  capturedAt: '2026-09-14T15:47:00Z',
}

const signal = (market: string, direction: string | null, line: number | null): LiveSignal => ({
  id: 'ls_x',
  sport: 'basketball',
  startsAt: '2026-09-14T18:45:00Z',
  market,
  direction,
  line,
  fairProb: 0.47,
  fairOdds: 1 / 0.47,
  pinnacleOdds: 2,
  home: 'Rio Breogan',
  away: 'Rilski Sportist',
  bestBook: 'Betsson',
  bestOdds: 2.1,
  bestEdge: 0.02,
  status: 'open',
  firstSeenAt: '2026-09-14T15:16:00Z',
  lastSeenAt: '2026-09-14T15:47:00Z',
  closedAt: null,
  prices: [price],
})

describe('betPayload', () => {
  it('spread: picks the side as the book spells it, keeps the line', () => {
    const body = betPayload(signal('spread', 'home', -16.5), price, 12)
    expect(body).toMatchObject({
      match: 'Breogan Lugo vs Rilski Sportist',
      marketType: 'spread',
      pickName: 'Breogan Lugo',
      line: -16.5,
      bookmaker: 'Betsson',
      stake: 12,
      sport: 'BASKETBALL',
    })
  })

  it('total: no pick name, the description carries over/under', () => {
    const body = betPayload(signal('total', 'over', 171.5), { ...price, selectionLabel: 'Suminis: Daugiau 171.5' }, 5)
    expect(body.pickName).toBeNull()
    expect(body.betDescription).toContain('Daugiau')
  })

  it('falls back to signal names when the event name is not "A – B"', () => {
    const body = betPayload(signal('moneyline', 'away', null), { ...price, eventName: 'Breogan Lugo' }, 5)
    expect(body.pickName).toBe('Rilski Sportist')
    expect(body.match).toBe('Rio Breogan vs Rilski Sportist')
  })
})
