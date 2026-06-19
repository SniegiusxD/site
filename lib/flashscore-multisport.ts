/**
 * Flashscore multisport results (Phase 7) — auto-settle volleyball, non-NBA
 * basketball, ice hockey and cricket bets when ESPN has no coverage.
 *
 * Fetched from VPS odds_api `/api/multisport-results` (cached JSON written by
 * run_flashscore_multisport.py). 5-minute cache, fuzzy team-name matching.
 */

export type MultisportSport = 'volleyball' | 'basketball' | 'hockey' | 'cricket'

export type MultisportResult = {
  sport: string
  source: 'flashscore'
  status: 'finished'
  tournament?: string
  match_id?: string
  teams: { home?: string; away?: string }
  winner: 'home' | 'away' | null
  start_date?: string
  // volleyball
  home_sets?: number
  away_sets?: number
  sets?: Array<{ home: number; away: number }>
  // basketball / hockey / cricket
  home_score?: number
  away_score?: number
}

type MultisportPayload = {
  timestamp?: string
  source?: string
  results?: Record<string, MultisportResult[]>
}

const CACHE_MS = 5 * 60 * 1000
let cached: { at: number; bySport: Record<string, MultisportResult[]> } | null = null

function resultsUrl(): string | null {
  const direct = process.env.MULTISPORT_RESULTS_URL?.trim()
  if (direct) return direct
  const base = process.env.ODDS_API_URL?.trim()
  if (base) return `${base.replace(/\/$/, '')}/api/multisport-results`
  return 'http://95.179.153.249:5001/api/multisport-results'
}

/** Load all multisport results grouped by sport (cached 5 min). */
export async function loadMultisportResults(): Promise<Record<string, MultisportResult[]>> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.bySport
  }
  const url = resultsUrl()
  if (!url) return {}

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return {}
    const data = (await res.json()) as MultisportPayload
    const bySport: Record<string, MultisportResult[]> = {}
    for (const [sport, list] of Object.entries(data.results ?? {})) {
      bySport[sport.toLowerCase()] = (list ?? []).filter((r) => r.status === 'finished')
    }
    cached = { at: Date.now(), bySport }
    return bySport
  } catch {
    return {}
  }
}

/** Clear cache (tests). */
export function clearMultisportCache() {
  cached = null
}

export type OrientedMultisport = {
  homeName: string
  awayName: string
  homeScore: number
  awayScore: number
  homeWon: boolean
  /** Whether ESPN-style numeric scores are available (false for cricket-only winner). */
  hasScores: boolean
}

/**
 * Find a finished multisport match oriented to our home/away hints.
 *
 * For volleyball, "score" = sets won. For basketball/hockey, final score.
 * For cricket, scores may be 0/0 (winner-only); hasScores reflects that.
 */
export function findMultisportFixture(
  results: MultisportResult[],
  homeHint: string,
  awayHint: string,
  namesMatch: (a: string, b: string) => boolean,
): OrientedMultisport | null {
  for (const r of results) {
    const h = r.teams?.home
    const a = r.teams?.away
    if (!h || !a || !r.winner) continue

    // Volleyball uses sets; others use score
    const homeVal = r.home_sets ?? r.home_score ?? 0
    const awayVal = r.away_sets ?? r.away_score ?? 0
    const hasScores = (r.home_sets != null && r.away_sets != null) ||
                      (r.home_score != null && r.away_score != null)
    const homeWonRaw = r.winner === 'home'

    if (namesMatch(homeHint, h) && namesMatch(awayHint, a)) {
      return { homeName: h, awayName: a, homeScore: homeVal, awayScore: awayVal, homeWon: homeWonRaw, hasScores }
    }
    if (namesMatch(homeHint, a) && namesMatch(awayHint, h)) {
      // our home is Flashscore's away → swap
      return { homeName: a, awayName: h, homeScore: awayVal, awayScore: homeVal, homeWon: !homeWonRaw, hasScores }
    }
  }
  return null
}
