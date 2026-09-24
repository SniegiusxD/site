import { describe, expect, it } from 'vitest'
import { vilniusDay } from '@/lib/bets-calendar'
import { type BoardBet, dailyProgress } from '@/lib/exposure'
import { clockLabel, kickoffLabel } from '@/lib/live-view'
import { monthProgress } from '@/lib/month-progress'

/**
 * Everything a member reads as "today", "this month" or a kickoff time is
 * Europe/Vilnius: UTC+3 in summer, UTC+2 in winter. In 2026 the clocks go
 * forward on 29 March (03:00 becomes 04:00) and back on 25 October (04:00
 * becomes 03:00). Tests run in whatever zone the machine has; the code must
 * not care.
 */

const bet = (placedAt: string, stake = 10): BoardBet => ({
  id: placedAt,
  signalId: null,
  bookmaker: '7BET',
  stake,
  odds: 2,
  entryFairProb: 0.52,
  eventKey: null,
  placedAt,
})

describe('vilniusDay', () => {
  it('turns over at Vilnius midnight in summer (21:00 UTC)', () => {
    expect(vilniusDay('2026-09-14T20:59:59Z')).toBe('2026-09-14')
    expect(vilniusDay('2026-09-14T21:00:00Z')).toBe('2026-09-15')
  })

  it('turns over at Vilnius midnight in winter (22:00 UTC)', () => {
    expect(vilniusDay('2026-12-14T21:59:59Z')).toBe('2026-12-14')
    expect(vilniusDay('2026-12-14T22:00:00Z')).toBe('2026-12-15')
  })

  it('moves the year at Vilnius midnight, not UTC midnight', () => {
    expect(vilniusDay('2026-12-31T22:30:00Z')).toBe('2027-01-01')
  })
})

describe('the daily target around midnight and clock changes', () => {
  it('counts a bet at 00:30 Vilnius as the new day', () => {
    const now = new Date('2026-09-15T08:00:00Z')
    expect(dailyProgress([bet('2026-09-14T21:30:00Z'), bet('2026-09-14T20:30:00Z')], now).count).toBe(1)
  })

  it('keeps the whole 25-hour day on 25 October together', () => {
    // 00:30 (UTC+3), 03:30 before and after the clocks go back, 23:30 (UTC+2).
    const day = ['2026-10-24T21:30:00Z', '2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z', '2026-10-25T21:30:00Z']
    const now = new Date('2026-10-25T21:45:00Z')
    expect(dailyProgress([...day.map((at) => bet(at)), bet('2026-10-25T22:05:00Z')], now).count).toBe(4)
  })

  it('keeps the 23-hour day on 29 March together', () => {
    const day = ['2026-03-28T22:30:00Z', '2026-03-29T00:59:00Z', '2026-03-29T01:00:00Z', '2026-03-29T20:59:00Z']
    const now = new Date('2026-03-29T12:00:00Z')
    expect(dailyProgress([...day.map((at) => bet(at)), bet('2026-03-29T21:00:00Z')], now).count).toBe(4)
  })

  it('sums the value at entry to the cent', () => {
    // 3 × 10 € at 2,00 with 52 % fair: 3 × 10 × (1.04 − 1) = 1.20 €
    const now = new Date('2026-09-15T08:00:00Z')
    const progress = dailyProgress([bet('2026-09-15T06:00:00Z'), bet('2026-09-15T07:00:00Z'), bet('2026-09-15T07:30:00Z')], now)
    expect(progress).toEqual({ count: 3, staked: 30, value: 1.2 })
  })
})

describe('the month view at month ends and clock changes', () => {
  it('is already the new month at 00:05 on the 1st in Vilnius', () => {
    const m = monthProgress([{ placedAt: '2026-10-31T22:30:00Z' }, { placedAt: '2026-10-31T21:30:00Z' }], new Date('2026-10-31T22:05:00Z'), 2)
    expect(m.label).toBe('Lapkritis')
    expect(m.today).toBe(1)
    expect(m.total).toBe(1)
    expect(m.expectedByToday).toBe(2)
  })

  it('knows February has 28 days in 2026 and 29 in 2028', () => {
    expect(monthProgress([], new Date('2026-02-10T10:00:00Z'), 1).daysInMonth).toBe(28)
    expect(monthProgress([], new Date('2028-02-10T10:00:00Z'), 1).daysInMonth).toBe(29)
  })

  it('puts both 03:30s of 25 October on the 25th', () => {
    const m = monthProgress([{ placedAt: '2026-10-25T00:30:00Z' }, { placedAt: '2026-10-25T01:30:00Z' }], new Date('2026-10-26T10:00:00Z'), 1)
    expect(m.perDay[24]).toBe(2)
    expect(m.daysReached).toBe(1)
  })

  it('does not count a day as reached with a zero target', () => {
    expect(monthProgress([{ placedAt: '2026-09-02T10:00:00Z' }], new Date('2026-09-03T10:00:00Z'), 0).daysReached).toBe(0)
  })
})

describe('kickoff labels in Vilnius time', () => {
  it('shows the summer offset before the clocks go back and the winter one after', () => {
    expect(kickoffLabel('2026-10-24T22:30:00Z')).toBe('spal. 25 d. 01:30')
    // 03:30 happens twice that night.
    expect(clockLabel('2026-10-25T00:30:00Z')).toBe('03:30')
    expect(clockLabel('2026-10-25T01:30:00Z')).toBe('03:30')
  })

  it('skips the hour that does not exist on 29 March', () => {
    expect(clockLabel('2026-03-29T00:59:00Z')).toBe('02:59')
    expect(clockLabel('2026-03-29T01:00:00Z')).toBe('04:00')
  })

  it('writes midnight as 00:00 on the new day', () => {
    expect(kickoffLabel('2026-12-31T22:00:00Z')).toBe('saus. 1 d. 00:00')
  })
})
