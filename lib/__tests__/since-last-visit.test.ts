import { describe, expect, it } from 'vitest'
import { latestSettlement, settledSince } from '@/lib/since-last-visit'

const bets = [
  { status: 'laimeta' as const, profit: 12.5, settledAtIso: '2026-09-14T20:00:00.000Z' },
  { status: 'pralaimeta' as const, profit: -10, settledAtIso: '2026-09-15T08:00:00.000Z' },
  { status: 'grazinta' as const, profit: 0, settledAtIso: '2026-09-15T09:00:00.000Z' },
  { status: 'laimeta' as const, profit: 7.25, settledAtIso: '2026-09-15T10:00:00.000Z' },
  { status: 'laukia' as const, profit: null, settledAtIso: null },
]

describe('settledSince', () => {
  it('shows nothing on a first visit', () => {
    expect(settledSince(bets, null)).toBeNull()
  })

  it('sums what settled after the marker', () => {
    expect(settledSince(bets, '2026-09-15T00:00:00.000Z')).toEqual({ count: 3, won: 1, lost: 1, pushed: 1, profit: -2.75 })
  })

  it('counts every settled bet for a member who had none when they last looked', () => {
    expect(settledSince(bets, '')?.count).toBe(4)
  })

  it('shows nothing when nothing is newer', () => {
    expect(settledSince(bets, '2026-09-15T10:00:00.000Z')).toBeNull()
  })
})

describe('latestSettlement', () => {
  it('is the newest settlement time, ignoring pending bets', () => {
    expect(latestSettlement(bets)).toBe('2026-09-15T10:00:00.000Z')
    expect(latestSettlement([{ status: 'laukia', profit: null, settledAtIso: null }])).toBe('')
  })
})
