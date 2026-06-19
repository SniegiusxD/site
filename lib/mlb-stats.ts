/**
 * MLB player box-score stats (Phase 7) — auto-settle MLB player props.
 *
 * Fetched from VPS odds_api `/api/mlb-stats` (cached JSON written by
 * run_mlb_boxscore.py from ESPN). 5-minute cache, fuzzy player-name matching.
 */

export type MlbPlayerStats = {
  game_id: string
  game: string
  date: string
  team: string
  player: string
  stat_type: 'batting' | 'pitching'
  stats: Record<string, number | null>
  status: 'finished' | 'in_progress'
  scraped_at?: string
}

type MlbStatsPayload = {
  timestamp?: string
  source?: string
  count?: number
  players?: MlbPlayerStats[]
}

const CACHE_MS = 5 * 60 * 1000
let cached: { at: number; players: MlbPlayerStats[] } | null = null

/** Map prop market key → stat field in the player's stats dict. */
export const MLB_MARKET_TO_STAT: Record<string, string> = {
  batter_hits: 'hits',
  batter_home_runs: 'home_runs',
  batter_total_bases: 'total_bases',
  batter_rbis: 'rbis',
  pitcher_strikeouts: 'strikeouts_pitcher',
}

function statsUrl(): string | null {
  const direct = process.env.MLB_STATS_URL?.trim()
  if (direct) return direct
  const base = process.env.ODDS_API_URL?.trim()
  if (base) return `${base.replace(/\/$/, '')}/api/mlb-stats`
  return 'http://95.179.153.249:5001/api/mlb-stats'
}

export async function loadMlbStats(): Promise<MlbPlayerStats[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.players
  }
  const url = statsUrl()
  if (!url) return []

  try {
    const res = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return []
    const data = (await res.json()) as MlbStatsPayload
    const players = data.players ?? []
    cached = { at: Date.now(), players }
    return players
  } catch {
    return []
  }
}

/** Clear cache (tests). */
export function clearMlbStatsCache() {
  cached = null
}

/**
 * Find a player's stat value for a market. Returns null when the player isn't
 * found (or game not finished), so the grader keeps the bet pending.
 */
export function findPlayerStat(
  players: MlbPlayerStats[],
  playerName: string,
  market: string,
  namesMatch: (a: string, b: string) => boolean,
): { value: number; matchedPlayer: string } | null {
  const statField = MLB_MARKET_TO_STAT[market]
  if (!statField) return null
  const needPitching = market.startsWith('pitcher')
  const wantType = needPitching ? 'pitching' : 'batting'

  for (const p of players) {
    if (p.stat_type !== wantType) continue
    if (p.status !== 'finished') continue
    if (!namesMatch(playerName, p.player)) continue
    const v = p.stats?.[statField]
    if (typeof v === 'number') {
      return { value: v, matchedPlayer: p.player }
    }
  }
  return null
}
