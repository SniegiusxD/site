import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  findMultisportFixture,
  loadMultisportResults,
  clearMultisportCache,
  type MultisportResult,
} from '@/lib/flashscore-multisport'
import {
  findPlayerStat,
  loadMlbStats,
  clearMlbStatsCache,
  type MlbPlayerStats,
} from '@/lib/mlb-stats'

// Simple namesMatch mirroring bet-grader's behaviour for tests.
function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  const sa = a.toLowerCase().replace(/[^a-z0-9]/g, '')
  const sb = b.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (sa.length < 3 || sb.length < 3) return sa === sb
  return sa.includes(sb) || sb.includes(sa)
}

describe('findMultisportFixture (Phase 7)', () => {
  const volleyball: MultisportResult[] = [
    {
      sport: 'VOLLEYBALL', source: 'flashscore', status: 'finished',
      teams: { home: 'Czech Republic W', away: 'USA W' },
      winner: 'away', home_sets: 0, away_sets: 3,
      sets: [{ home: 22, away: 25 }, { home: 20, away: 25 }, { home: 18, away: 25 }],
    },
  ]

  it('orients volleyball fixture to our home/away (direct)', () => {
    const fx = findMultisportFixture(volleyball, 'Czech Republic W', 'USA W', namesMatch)
    expect(fx).not.toBeNull()
    expect(fx!.homeScore).toBe(0) // sets won by Czech
    expect(fx!.awayScore).toBe(3)
    expect(fx!.homeWon).toBe(false)
    expect(fx!.hasScores).toBe(true)
  })

  it('swaps orientation when our home is Flashscore away', () => {
    const fx = findMultisportFixture(volleyball, 'USA W', 'Czech Republic W', namesMatch)
    expect(fx).not.toBeNull()
    expect(fx!.homeScore).toBe(3) // USA won 3 sets, now our home
    expect(fx!.homeWon).toBe(true)
  })

  it('returns null when no name match', () => {
    const fx = findMultisportFixture(volleyball, 'Brazil', 'Italy', namesMatch)
    expect(fx).toBeNull()
  })
})

describe('loadMultisportResults (mocked fetch)', () => {
  beforeEach(() => clearMultisportCache())
  afterEach(() => vi.restoreAllMocks())

  it('groups results by sport from /api/multisport-results', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        timestamp: 'now', source: 'flashscore',
        results: {
          volleyball: [{
            sport: 'VOLLEYBALL', status: 'finished', source: 'flashscore',
            teams: { home: 'A', away: 'B' }, winner: 'home', home_sets: 3, away_sets: 1,
          }],
          basketball: [],
        },
      }),
    })) as unknown as typeof fetch)

    const bySport = await loadMultisportResults()
    expect(bySport.volleyball).toHaveLength(1)
    expect(bySport.basketball).toEqual([])
  })
})

describe('findPlayerStat (MLB props, Phase 7)', () => {
  const players: MlbPlayerStats[] = [
    {
      game_id: '1', game: 'A vs B', date: '2026-06-19', team: 'ATL',
      player: 'Matt Olson', stat_type: 'batting', status: 'finished',
      stats: { hits: 2, home_runs: 1, total_bases: 5, rbis: 3 },
    },
    {
      game_id: '1', game: 'A vs B', date: '2026-06-19', team: 'ATL',
      player: 'Spencer Strider', stat_type: 'pitching', status: 'finished',
      stats: { strikeouts_pitcher: 8, innings_pitched: 6 },
    },
  ]

  it('finds batting stat for a hits prop', () => {
    const r = findPlayerStat(players, 'Matt Olson', 'batter_hits', namesMatch)
    expect(r).not.toBeNull()
    expect(r!.value).toBe(2)
  })

  it('finds pitching stat for a strikeouts prop', () => {
    const r = findPlayerStat(players, 'Spencer Strider', 'pitcher_strikeouts', namesMatch)
    expect(r!.value).toBe(8)
  })

  it('returns null for unknown market', () => {
    expect(findPlayerStat(players, 'Matt Olson', 'batter_walks', namesMatch)).toBeNull()
  })

  it('returns null when player not finished / not found', () => {
    expect(findPlayerStat(players, 'Nobody', 'batter_hits', namesMatch)).toBeNull()
  })
})

describe('loadMlbStats (mocked fetch)', () => {
  beforeEach(() => clearMlbStatsCache())
  afterEach(() => vi.restoreAllMocks())

  it('reads players array from /api/mlb-stats', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        source: 'espn_mlb', count: 1,
        players: [{
          game_id: '1', player: 'X', team: 'NYM', stat_type: 'batting',
          status: 'finished', stats: { hits: 1 }, game: 'x', date: 'd',
        }],
      }),
    })) as unknown as typeof fetch)

    const players = await loadMlbStats()
    expect(players).toHaveLength(1)
    expect(players[0].player).toBe('X')
  })
})
