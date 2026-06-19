/**
 * Flashscore tennis results (#39) — fallback when ESPN lacks ITF/Challenger coverage.
 * Fetched from VPS odds_api `/api/tennis-results` (cached JSON from scraper).
 */

export type FlashscoreSet = { p1_games: number; p2_games: number }

export type FlashscoreResult = {
  sport: 'TENNIS'
  source: 'flashscore'
  status: 'finished'
  winner: 'player1' | 'player2' | null
  players: { player1: string; player2: string }
  sets: FlashscoreSet[]
  total_games_p1: number
  total_games_p2: number
  tournament?: string
  start_date?: string
}

type ResultsPayload = {
  timestamp?: string
  count?: number
  results?: FlashscoreResult[]
}

const CACHE_MS = 5 * 60 * 1000
let cached: { at: number; results: FlashscoreResult[] } | null = null

function resultsUrl(): string | null {
  const direct = process.env.TENNIS_RESULTS_URL?.trim()
  if (direct) return direct
  const base = process.env.ODDS_API_URL?.trim()
  if (base) return `${base.replace(/\/$/, '')}/api/tennis-results`
  // Public VPS default (same host as opportunities API)
  return 'http://95.179.153.249:5001/api/tennis-results'
}

export async function loadFlashscoreResults(): Promise<FlashscoreResult[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.results
  }
  const url = resultsUrl()
  if (!url) return []

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = (await res.json()) as ResultsPayload
    const results = (data.results ?? []).filter(
      (r) => r.status === 'finished' && r.sport === 'TENNIS',
    )
    cached = { at: Date.now(), results }
    return results
  } catch {
    return []
  }
}

/** Clear cache (tests). */
export function clearFlashscoreCache() {
  cached = null
}

export type OrientedFlashscore = {
  homeName: string
  awayName: string
  homeGames: number
  awayGames: number
  homeWon: boolean
}

/**
 * Find a finished Flashscore match oriented to our home/away hints.
 */
export function findFlashscoreFixture(
  results: FlashscoreResult[],
  homeHint: string,
  awayHint: string,
  namesMatch: (a: string, b: string) => boolean,
): OrientedFlashscore | null {
  for (const r of results) {
    const p1 = r.players.player1
    const p2 = r.players.player2
    if (!p1 || !p2 || !r.winner) continue

    const p1Won = r.winner === 'player1'

    if (namesMatch(homeHint, p1) && namesMatch(awayHint, p2)) {
      return {
        homeName: p1,
        awayName: p2,
        homeGames: r.total_games_p1,
        awayGames: r.total_games_p2,
        homeWon: p1Won,
      }
    }
    if (namesMatch(homeHint, p2) && namesMatch(awayHint, p1)) {
      return {
        homeName: p2,
        awayName: p1,
        homeGames: r.total_games_p2,
        awayGames: r.total_games_p1,
        homeWon: !p1Won,
      }
    }
  }
  return null
}
