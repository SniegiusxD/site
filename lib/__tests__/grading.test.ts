import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { tryGradeBet } from '@/lib/bet-grader'
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
import { namesMatch, normalizeName } from '@/lib/name-matcher'

describe('name normalization and aliases', () => {
  it('strips accents, women markers, club abbreviations, punctuation and age groups', () => {
    expect(normalizeName('Žalgiris Kaunas (W), BC U20')).toBe('zalgiris kaunas')
    expect(namesMatch('FC Bayern München Women U20', 'Bayern Munich')).toBe(true)
  })

  it('applies team and player aliases before fuzzy matching', () => {
    expect(namesMatch('Crvena Zvezda mts', 'Red Star Belgrade')).toBe(true)
    expect(namesMatch('Sascha Zverev', 'Alexander Zverev')).toBe(true)
  })
})

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

  it('keeps Flashscore matching inside kickoff day +/- 1', () => {
    const oldResult = [{ ...volleyball[0], start_date: '2026-06-16' }]
    const fx = findMultisportFixture(
      oldResult,
      'Czech Republic W',
      'USA W',
      namesMatch,
      new Date('2026-06-19T18:00:00Z'),
    )
    expect(fx).toBeNull()
  })
})

describe('tryGradeBet fallback order', () => {
  beforeEach(() => clearMultisportCache())
  afterEach(() => vi.restoreAllMocks())

  it('tries ESPN first, then Flashscore multisport for covered sports', async () => {
    const urls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      urls.push(url)
      if (url.includes('site.api.espn.com')) {
        return { ok: true, json: async () => ({ events: [] }) }
      }
      if (url.includes('/api/multisport-results')) {
        return {
          ok: true,
          json: async () => ({
            results: {
              basketball: [{
                sport: 'BASKETBALL',
                source: 'flashscore',
                status: 'finished',
                start_date: '2026-06-19',
                teams: { home: 'Red Star Belgrade', away: 'Partizan Belgrade' },
                winner: 'home',
                home_score: 88,
                away_score: 80,
              }],
            },
          }),
        }
      }
      return { ok: false, json: async () => ({}) }
    }) as unknown as typeof fetch)

    const result = await tryGradeBet({
      id: 'bet-1',
      sport: 'BASKETBALL',
      match: 'Crvena Zvezda mts vs Partizan Mozzart Bet',
      betDescription: 'Crvena Zvezda mts moneyline',
      marketType: 'moneyline',
      pickName: 'Crvena Zvezda mts',
      line: null,
      homeName: 'Crvena Zvezda mts',
      awayName: 'Partizan Mozzart Bet',
      startsAt: new Date('2026-06-19T18:00:00Z'),
      placedAt: new Date('2026-06-19T12:00:00Z'),
      stake: 10,
      odds: 1.8,
    })

    expect(result).toEqual({ status: 'laimeta', profit: 8 })
    expect(urls[0]).toContain('site.api.espn.com')
    expect(urls.findIndex((u) => u.includes('/api/multisport-results'))).toBeGreaterThan(0)
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
