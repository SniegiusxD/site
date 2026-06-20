import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  rows: [] as any[],
  updates: [] as any[],
}))

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => state.rows,
      }),
    }),
    update: () => ({
      set: (value: any) => ({
        where: async () => {
          state.updates.push(value)
        },
      }),
    }),
  },
}))

vi.mock('@/lib/bet-grader', () => ({
  tryGradeBet: vi.fn(async () => null),
  diagnoseBetBlocker: vi.fn(async () => 'espn_no_match_or_unfinished; flashscore_multisport_fetch_empty_basketball'),
}))

import { settlePendingBets } from '@/lib/settle-bets'

function pendingBet(id: string, startsAt: Date) {
  return {
    id,
    userId: 'user-1',
    sport: 'BASKETBALL',
    match: 'Crvena Zvezda mts vs Partizan Mozzart Bet',
    betDescription: 'Crvena Zvezda mts moneyline',
    bookmaker: 'Test',
    odds: 1.8,
    stake: 10,
    marketType: 'moneyline',
    pickName: 'Crvena Zvezda mts',
    line: null,
    homeName: 'Crvena Zvezda mts',
    awayName: 'Partizan Mozzart Bet',
    gameKey: null,
    startsAt,
    status: 'laukia',
    profit: null,
    placedAt: startsAt,
    settledAt: null,
  }
}

describe('settlePendingBets unresolved handling', () => {
  beforeEach(() => {
    state.rows = []
    state.updates = []
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-20T18:00:00Z'))
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('keeps retrying pending bets before 24h and voids unresolved bets after 24h', async () => {
    state.rows = [
      pendingBet('old', new Date('2026-06-19T17:00:00Z')),
      pendingBet('recent', new Date('2026-06-19T20:00:00Z')),
    ]

    const summary = await settlePendingBets({ debug: true })

    expect(summary.pendingCount).toBe(1)
    expect(summary.unresolvedCount).toBe(1)
    expect(summary.topBlockerReasons).toEqual([
      {
        reason: 'espn_no_match_or_unfinished; flashscore_multisport_fetch_empty_basketball',
        count: 2,
      },
    ])
    expect(state.updates).toContainEqual(
      expect.objectContaining({ status: 'neisspresta', profit: 0 }),
    )
    expect(state.updates).not.toContainEqual(
      expect.objectContaining({ id: 'recent', status: 'neisspresta' }),
    )
  })
})

