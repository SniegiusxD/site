import { describe, expect, it } from 'vitest'
import {
  MIN_BETS_FOR_RATE,
  type TopRow,
  parseMonth,
  parseTopProfile,
  rankMembers,
  runningSeries,
  shiftMonth,
  vilniusMonth,
} from '@/lib/top'

const row = (userId: string, patch: Partial<TopRow> = {}): TopRow => ({
  userId,
  name: userId,
  optedIn: true,
  bets: 12,
  won: 6,
  lost: 5,
  pushed: 1,
  profit: 10,
  staked: 120,
  clv: 0.02,
  clvBets: 10,
  ...patch,
})

describe('rankMembers', () => {
  it('ranks joined members by profit and never shows members who did not join', () => {
    const board = rankMembers(
      [row('ona', { profit: 40 }), row('jonas', { profit: 90 }), row('hidden', { optedIn: false, name: null, profit: 500 }), row('petras', { profit: -15 })],
      'viewer',
      'profit',
    )
    expect(board.ranked.map((entry) => [entry.rank, entry.name])).toEqual([
      [1, 'jonas'],
      [2, 'ona'],
      [3, 'petras'],
    ])
    expect(board.tooFew).toEqual([])
    expect(board.you).toBeNull()
    expect(JSON.stringify(board)).not.toContain('hidden')
  })

  it('shows a member who has not joined their own line and the place they would take', () => {
    const board = rankMembers(
      [row('ona', { profit: 40 }), row('jonas', { profit: 90 }), row('me', { optedIn: false, name: null, profit: 50 })],
      'me',
      'profit',
    )
    expect(board.ranked.map((entry) => entry.name)).toEqual(['jonas', 'ona'])
    expect(board.you).toMatchObject({ name: 'Tu', isYou: true, wouldBe: 2, profit: 50, rank: null })
  })

  it('marks the viewer inside the ranking once joined', () => {
    const board = rankMembers([row('ona'), row('me', { name: 'Tomas', profit: 99 })], 'me', 'profit')
    expect(board.ranked[0]).toMatchObject({ rank: 1, name: 'Tomas', isYou: true })
    expect(board.you).toBeNull()
  })

  it('needs a sample for the ROI and CLV rankings', () => {
    const rows = [
      row('small', { bets: MIN_BETS_FOR_RATE - 1, clvBets: MIN_BETS_FOR_RATE - 1, profit: 50, staked: 50 }),
      row('steady', { profit: 12, staked: 100, clv: 0.031, clvBets: 14 }),
      row('lucky', { profit: 30, staked: 150, clv: 0.004, clvBets: 3 }),
    ]
    const roi = rankMembers(rows, 'viewer', 'roi')
    expect(roi.ranked.map((entry) => entry.name)).toEqual(['lucky', 'steady'])
    expect(roi.tooFew.map((entry) => entry.name)).toEqual(['small'])

    const clv = rankMembers(rows, 'viewer', 'clv')
    expect(clv.ranked.map((entry) => entry.name)).toEqual(['steady'])
    expect(clv.tooFew.map((entry) => entry.name)).toEqual(['lucky', 'small'])
  })

  it('gives no would-be place when the viewer has too few bets for the sort', () => {
    const board = rankMembers([row('ona'), row('me', { optedIn: false, name: null, bets: 3 })], 'me', 'roi')
    expect(board.you?.wouldBe).toBeNull()
  })

  it('gives the viewer the better place on a tie, but not against more bets', () => {
    const tie = rankMembers([row('jonas', { profit: 50 }), row('me', { optedIn: false, name: null, profit: 50 })], 'me', 'profit')
    expect(tie.you?.wouldBe).toBe(1)
    const busier = rankMembers([row('jonas', { profit: 50, bets: 20 }), row('me', { optedIn: false, name: null, profit: 50 })], 'me', 'profit')
    expect(busier.you?.wouldBe).toBe(2)
  })

  it('breaks ties by more bets, then by name', () => {
    const board = rankMembers(
      [row('Žygis', { profit: 20 }), row('Aistė', { profit: 20 }), row('Bronius', { profit: 20, bets: 30 })],
      'viewer',
      'profit',
    )
    expect(board.ranked.map((entry) => entry.name)).toEqual(['Bronius', 'Aistė', 'Žygis'])
  })

  it('treats a switched-on member without a name as not joined', () => {
    expect(rankMembers([row('noname', { name: null })], 'viewer', 'profit').ranked).toEqual([])
  })
})

describe('parseTopProfile', () => {
  it('accepts a nickname and tidies spaces', () => {
    expect(parseTopProfile({ optIn: true, name: '  Tomas   K. ' })).toEqual({ ok: true, value: { optIn: true, name: 'Tomas K.' } })
    expect(parseTopProfile({ optIn: true, name: 'Šarūnas_77' }).ok).toBe(true)
  })

  it('needs a name to join, but not to leave', () => {
    expect(parseTopProfile({ optIn: true, name: '' }).ok).toBe(false)
    expect(parseTopProfile({ optIn: false, name: '' })).toEqual({ ok: true, value: { optIn: false, name: null } })
  })

  it('refuses emails, digit-only, too short, too long and markup names', () => {
    for (const name of ['tomas@gmail.com', '1234', 'a', 'x'.repeat(21), '<b>hi</b>']) {
      expect(parseTopProfile({ optIn: true, name }).ok).toBe(false)
    }
  })

  it('refuses a missing choice', () => {
    expect(parseTopProfile({ name: 'Tomas' }).ok).toBe(false)
  })
})

describe('months', () => {
  it('uses the Vilnius calendar month', () => {
    expect(vilniusMonth(new Date('2026-08-31T21:30:00Z'))).toBe('2026-09')
    expect(vilniusMonth(new Date('2026-08-31T20:30:00Z'))).toBe('2026-08')
  })

  it('falls back to this month for invalid or future months', () => {
    const now = new Date('2026-09-15T12:00:00Z')
    expect(parseMonth('2026-08', now)).toBe('2026-08')
    expect(parseMonth('2026-10', now)).toBe('2026-09')
    expect(parseMonth('2026-13', now)).toBe('2026-09')
    expect(parseMonth(null, now)).toBe('2026-09')
  })

  it('moves across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
})

describe('runningSeries', () => {
  it('starts at zero and ends on the total', () => {
    expect(runningSeries([10, -4, 2.5])).toEqual([0, 10, 6, 8.5])
    const long = runningSeries(Array.from({ length: 100 }, () => 1), 32)
    expect(long).toHaveLength(32)
    expect(long[0]).toBe(0)
    expect(long[31]).toBe(100)
  })
})
