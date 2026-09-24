import { describe, expect, it } from 'vitest'
import { monthProgress } from '@/lib/month-progress'

describe('monthProgress', () => {
  const now = new Date('2026-09-24T12:00:00Z')

  it('counts bets per Vilnius day of the current month only', () => {
    const bets = [
      { placedAt: '2026-09-01T08:00:00Z' },
      { placedAt: '2026-09-01T09:00:00Z' },
      { placedAt: '2026-08-31T22:30:00Z' }, // 1 September 01:30 in Vilnius
      { placedAt: '2026-08-31T12:00:00Z' }, // August: left out
      { placedAt: '2026-09-24T10:00:00Z' },
    ]
    const m = monthProgress(bets, now, 2)
    expect(m.label).toBe('Rugsėjis')
    expect(m.daysInMonth).toBe(30)
    expect(m.perDay[0]).toBe(3)
    expect(m.perDay[23]).toBe(1)
    expect(m.total).toBe(4)
  })

  it('compares with where the target says you should be today', () => {
    const bets = Array.from({ length: 40 }, (_, i) => ({ placedAt: `2026-09-${String((i % 20) + 1).padStart(2, '0')}T10:00:00Z` }))
    const m = monthProgress(bets, now, 2)
    expect(m.monthTarget).toBe(60)
    expect(m.expectedByToday).toBe(48)
    expect(m.pace).toBeCloseTo(40 / 48 - 1)
    expect(m.daysReached).toBe(20)
    expect(m.projected).toBe(Math.round((40 / 24) * 30))
  })
})
