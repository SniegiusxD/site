import { describe, expect, it } from 'vitest'
import { isWeak, renderClvReport } from '@/lib/clv-report'
import type { PastSignal } from '@/lib/public-results'

const now = new Date('2026-09-26T08:00:00Z')

function signal(i: number, over: Partial<PastSignal>): PastSignal {
  return {
    id: `s${i}`,
    sport: 'basketball',
    startsAt: '2026-09-24T18:00:00Z',
    market: 'spread',
    direction: 'home',
    line: -4.5,
    home: 'A',
    away: 'B',
    book: '7BET',
    odds: 2,
    edge: 0.03,
    closingFairProb: 0.52,
    outcome: 'won',
    ...over,
  }
}

describe('isWeak', () => {
  it('needs 10 closes and a losing CLV or a low beat rate', () => {
    expect(isWeak({ withClose: 9, meanClv: -0.1, beatClose: 0.2 })).toBe(false)
    expect(isWeak({ withClose: 10, meanClv: -0.01, beatClose: 0.7 })).toBe(true)
    expect(isWeak({ withClose: 10, meanClv: 0.02, beatClose: 0.55 })).toBe(true)
    expect(isWeak({ withClose: 40, meanClv: 0.03, beatClose: 0.8 })).toBe(false)
  })
})

describe('renderClvReport', () => {
  const good = Array.from({ length: 24 }, (_, i) => signal(i, {}))
  const bad = Array.from({ length: 12 }, (_, i) =>
    signal(100 + i, { sport: 'football', book: 'Betsson', market: 'moneyline_home', closingFairProb: 0.45, outcome: 'lost' }),
  )
  const report = renderClvReport([...good, ...bad], now)

  it('lists the losing cell and the clearly fine one, marking small samples', () => {
    expect(report).toContain('| football · Betsson · moneyline | 12 (small) | 0 % | −')
    expect(report.split('## Clearly fine')[1]).toContain('basketball · 7BET · spread | 24 (small) | 100 %')
  })

  it('states the totals and the last week', () => {
    expect(report).toContain('Every published signal whose match started in the last 30 days (36; 36 with a close,')
    expect(report).toContain('**Last 7 days:**')
  })
})
