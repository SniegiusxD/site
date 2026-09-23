import { describe, expect, it } from 'vitest'
import type { LiveSignal } from '@/lib/live-signals'
import {
  agoLabel,
  boardRows,
  eventLabel,
  isInterpolatedLabel,
  isStale,
  kickoffLabel,
  ltNumbers,
  ltSelection,
  playablePrice,
  timeUntilLabel,
} from '@/lib/live-view'

const NOW = new Date('2026-09-14T16:00:00Z')

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
    prices: [
      { book: 'TopSport', odds: 2.49, edge: 0.0142, published: true, eventName: 'Rio Breogan – Rilski Sportist', selectionLabel: 'Handikapas: Rio Breogan -16.5', capturedAt: '2026-09-14T15:47:00Z' },
      { book: 'Betsson', odds: 2.1, edge: -0.14, published: false, eventName: 'Breogan Lugo – Rilski Sportist', selectionLabel: 'Handikapas: Breogan Lugo -16.5', capturedAt: '2026-09-14T15:47:00Z' },
    ],
    ...overrides,
  }
}

const filters = { books: ['7BET', 'TopSport', 'Betsson'] as const, minEdge: 0.01, minOdds: 1.3, maxOdds: 6, maxHoursToStart: 48, sport: null }

describe('playablePrice', () => {
  it('only counts published prices from books the user has', () => {
    expect(playablePrice(signal(), { ...filters, books: ['TopSport'] })?.book).toBe('TopSport')
    expect(playablePrice(signal(), { ...filters, books: ['Betsson'] })).toBeNull()
  })

  it('respects minimum value and odds range', () => {
    expect(playablePrice(signal(), { ...filters, books: [...filters.books], minEdge: 0.02 })).toBeNull()
    expect(playablePrice(signal(), { ...filters, books: [...filters.books], maxOdds: 2.4 })).toBeNull()
  })
})

describe('boardRows', () => {
  it('splits open and closed and drops signals outside the time window', () => {
    const rows = boardRows(
      [
        signal(),
        signal({ id: 'late', startsAt: '2026-09-20T18:00:00Z' }),
        signal({ id: 'started', startsAt: '2026-09-14T15:00:00Z' }),
        signal({ id: 'closed', status: 'closed', closedAt: '2026-09-14T15:50:00Z' }),
      ],
      { ...filters, books: [...filters.books] },
      NOW,
    )
    expect(rows.open.map((r) => r.signal.id)).toEqual(['ls_1'])
    expect(rows.closed.map((r) => r.signal.id)).toEqual(['closed', 'started'])
  })

  it('filters by sport', () => {
    expect(boardRows([signal()], { ...filters, books: [...filters.books], sport: 'tennis' }, NOW).open).toHaveLength(0)
  })

  it('keeps first-half corner markets in the corners and part filters', () => {
    const rows = boardRows(
      [
        signal({ id: 'match-corners', market: 'corner_total' }),
        signal({ id: 'half-corners', market: 'corner_totals_1h' }),
        signal({ id: 'team-corners', market: 'corner_team_total' }),
        signal({ id: 'half-team-corners', market: 'corner_team_totals_1h' }),
      ],
      {
        ...filters,
        books: [...filters.books],
        markets: ['corners'],
        periods: ['part'],
      },
      NOW,
    )

    expect(rows.open.map((row) => row.signal.id)).toEqual([
      'half-corners',
      'half-team-corners',
    ])
  })
})

describe('labels', () => {
  it('formats time until start', () => {
    expect(timeUntilLabel('2026-09-14T16:20:00Z', NOW)).toBe('po 20 min')
    expect(timeUntilLabel('2026-09-14T18:45:00Z', NOW)).toBe('po 2 val. 45 min')
    expect(timeUntilLabel('2026-09-16T17:00:00Z', NOW)).toBe('po 2 d. 1 val.')
    expect(timeUntilLabel('2026-09-14T15:00:00Z', NOW)).toBe('prasidėjo')
  })

  it('formats Vilnius kickoff and ago labels', () => {
    expect(kickoffLabel('2026-09-14T15:45:00Z')).toBe('rugs. 14 d. 18:45')
    expect(agoLabel('2026-09-14T15:47:00Z', NOW)).toBe('prieš 13 min')
    expect(agoLabel('2026-09-14T15:59:50Z', NOW)).toBe('ką tik')
  })

  it('uses Lithuanian decimals and minus signs', () => {
    expect(ltNumbers('Handikapas: Rio Breogan -16.5')).toBe('Handikapas: Rio Breogan −16,5')
    expect(ltNumbers('Suminis: Daugiau 171.5')).toBe('Suminis: Daugiau 171,5')
  })

  it('turns leftover English market words into Lithuanian', () => {
    expect(ltSelection('Mountfield HK regulation moneyline')).toBe('Mountfield HK laimės per pagrindinį laiką')
    expect(ltSelection('Soles Mexicali moneyline')).toBe('Soles Mexicali laimės')
    expect(ltSelection('Handikapas: Soles Mexicali -2.5')).toBe('Handikapas: Soles Mexicali −2,5')
  })

  it('drops the interpolation tag from labels but can still detect it', () => {
    expect(ltSelection('Suminis: Mažiau 2.0 (interp.)')).toBe('Suminis: Mažiau 2,0')
    expect(isInterpolatedLabel('Suminis: Mažiau 2.0 (interp.)')).toBe(true)
    expect(isInterpolatedLabel('Suminis: Mažiau 2.5')).toBe(false)
    expect(eventLabel('Peterborough – Barnsley')).toBe('Peterborough – Barnsley')
  })

  it('marks old scans as stale', () => {
    expect(isStale('2026-09-14T15:47:00Z', NOW)).toBe(false)
    expect(isStale('2026-09-14T14:00:00Z', NOW)).toBe(true)
    expect(isStale(undefined, NOW)).toBe(true)
  })
})
