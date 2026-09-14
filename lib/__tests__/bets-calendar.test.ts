import { describe, expect, it } from 'vitest'
import { betsByDay, monthGrid, vilniusDay } from '@/lib/bets-calendar'
import type { ActiveBet } from '@/lib/types'

function bet(overrides: Partial<ActiveBet>): ActiveBet {
  return {
    id: 'b',
    signalId: 's',
    sport: 'BASKETBALL',
    match: 'A vs B',
    betDescription: 'Handikapas: A -4.5',
    bookmaker: '7BET',
    odds: 2,
    stake: 10,
    status: 'laimeta',
    placedAt: 'Ką tik',
    profit: 10,
    startsAt: '2026-09-14T18:00:00Z',
    ...overrides,
  }
}

describe('vilniusDay', () => {
  it('uses Vilnius midnight, not UTC', () => {
    expect(vilniusDay('2026-09-14T21:30:00Z')).toBe('2026-09-15')
    expect(vilniusDay('2026-09-14T20:30:00Z')).toBe('2026-09-14')
  })
})

describe('betsByDay', () => {
  it('sums settled profit and stake, counts pending separately', () => {
    const days = betsByDay([
      bet({ id: '1', profit: 10, stake: 10 }),
      bet({ id: '2', status: 'pralaimeta', profit: -5, stake: 5 }),
      bet({ id: '3', status: 'laukia', profit: null }),
      bet({ id: '4', status: 'neisspresta', profit: null }),
      bet({ id: '5', startsAt: undefined }),
    ])
    expect(days.get('2026-09-14')).toEqual({ date: '2026-09-14', profit: 5, staked: 15, settled: 2, pending: 1 })
    expect(days.size).toBe(1)
  })
})

describe('monthGrid', () => {
  it('starts weeks on Monday and pads the edges', () => {
    const weeks = monthGrid(2026, 8) // September 2026 starts on a Tuesday
    expect(weeks[0]).toEqual([null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'])
    expect(weeks.at(-1)?.filter(Boolean).at(-1)).toBe('2026-09-30')
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })
})
