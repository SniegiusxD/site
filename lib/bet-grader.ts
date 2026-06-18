/**
 * Auto-settle pending moneyline bets using ESPN public scoreboards.
 * Spread/total/BTTS stay pending until we add line-aware grading.
 */

export type BetForGrading = {
  id: string
  sport: string
  match: string
  betDescription: string
  marketType: string
  pickName: string | null
  homeName: string | null
  awayName: string | null
  startsAt: Date | null
  stake: number
  odds: number
}

export type GradeResult = {
  status: 'laimeta' | 'pralaimeta'
  profit: number
}

const GRACE_MS = 3 * 60 * 60 * 1000 // 3h after scheduled start

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  const sa = slug(a)
  const sb = slug(b)
  if (sa.length < 3 || sb.length < 3) return sa === sb
  return sa.includes(sb) || sb.includes(sa)
}

export function extractPickName(betDescription: string, marketType: string): string | null {
  if (marketType === 'moneyline' && betDescription.toLowerCase().includes('moneyline')) {
    return betDescription.replace(/\s*moneyline\s*$/i, '').trim() || null
  }
  return null
}

export function parseMatchNames(match: string): { home: string; away: string } | null {
  const parts = match.split(/\s+vs\.?\s+|\s+@\s+|\s+-\s+/i)
  if (parts.length < 2) return null
  return { home: parts[0].trim(), away: parts[1].trim() }
}

function espnPathsForSport(sport: string): string[] {
  const s = sport.toUpperCase()
  if (s === 'TENNIS' || s === 'TABLE_TENNIS') {
    return ['tennis/atp/scoreboard', 'tennis/wta/scoreboard']
  }
  if (s === 'NBA') return ['basketball/nba/scoreboard']
  if (s === 'BASKETBALL') {
    return [
      'basketball/nba/scoreboard',
      'basketball/wnba/scoreboard',
      'basketball/mens-college-basketball/scoreboard',
      'basketball/womens-college-basketball/scoreboard',
    ]
  }
  if (s === 'BASEBALL' || s === 'MLB') {
    return ['baseball/mlb/scoreboard']
  }
  if (s === 'FOOTBALL' || s === 'SOCCER') {
    return ['soccer/all/scoreboard']
  }
  if (s === 'ICE_HOCKEY') return ['hockey/nhl/scoreboard']
  if (s === 'MMA' || s === 'BOXING') return ['mma/ufc/scoreboard']
  if (s === 'AMERICAN_FOOTBALL') return ['football/nfl/scoreboard']
  return []
}

type EspnCompetitor = {
  homeAway?: string
  winner?: boolean
  athlete?: { displayName?: string }
  team?: { displayName?: string; name?: string }
}

type EspnEvent = {
  competitions?: Array<{
    status?: { type?: { completed?: boolean; state?: string } }
    competitors?: EspnCompetitor[]
  }>
}

async function fetchEspnEvents(path: string, yyyymmdd: string): Promise<EspnEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${path}?dates=${yyyymmdd}`
  const res = await fetch(url, { next: { revalidate: 300 } })
  if (!res.ok) return []
  const data = (await res.json()) as { events?: EspnEvent[] }
  return data.events ?? []
}

function competitorName(c: EspnCompetitor): string {
  return (
    c.athlete?.displayName ??
    c.team?.displayName ??
    c.team?.name ??
    ''
  )
}

function eventFinished(ev: EspnEvent): boolean {
  const comp = ev.competitions?.[0]
  const st = comp?.status?.type
  return st?.completed === true || st?.state === 'post'
}

function gradeFromEspnEvent(
  ev: EspnEvent,
  pickName: string,
  homeHint: string,
  awayHint: string,
): boolean | null {
  const comp = ev.competitions?.[0]
  if (!comp?.competitors?.length || !eventFinished(ev)) return null

  const comps = comp.competitors
  let home = comps.find((c) => c.homeAway === 'home')
  let away = comps.find((c) => c.homeAway === 'away')
  if (!home || !away) {
    home = comps[0]
    away = comps[1]
  }
  if (!home || !away) return null

  const homeName = competitorName(home)
  const awayName = competitorName(away)

  // Match event to our fixture (order may differ on ESPN)
  const fixtureOk =
    (namesMatch(homeHint, homeName) && namesMatch(awayHint, awayName)) ||
    (namesMatch(homeHint, awayName) && namesMatch(awayHint, homeName)) ||
    namesMatch(homeHint, homeName) ||
    namesMatch(awayHint, awayName) ||
    namesMatch(pickName, homeName) ||
    namesMatch(pickName, awayName)

  if (!fixtureOk) return null

  const homeWon = home.winner === true
  const awayWon = away.winner === true
  if (!homeWon && !awayWon) return null

  if (namesMatch(pickName, homeName)) return homeWon
  if (namesMatch(pickName, awayName)) return awayWon
  if (namesMatch(pickName, homeHint)) return homeWon
  if (namesMatch(pickName, awayHint)) return awayWon
  return null
}

function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export async function tryGradeBet(bet: BetForGrading): Promise<GradeResult | null> {
  if (bet.marketType !== 'moneyline') return null

  const pickName =
    bet.pickName ?? extractPickName(bet.betDescription, bet.marketType)
  if (!pickName) return null

  const parsed = parseMatchNames(bet.match)
  const homeHint = bet.homeName ?? parsed?.home ?? ''
  const awayHint = bet.awayName ?? parsed?.away ?? ''
  if (!homeHint && !awayHint) return null

  const start = bet.startsAt ?? new Date()
  if (Date.now() < start.getTime() + GRACE_MS) return null

  const dates = [yyyymmdd(start)]
  const prev = new Date(start)
  prev.setUTCDate(prev.getUTCDate() - 1)
  dates.push(yyyymmdd(prev))

  const paths = espnPathsForSport(bet.sport)
  if (!paths.length) return null

  for (const path of paths) {
    for (const date of dates) {
      let events: EspnEvent[]
      try {
        events = await fetchEspnEvents(path, date)
      } catch {
        continue
      }
      for (const ev of events) {
        const won = gradeFromEspnEvent(ev, pickName, homeHint, awayHint)
        if (won === null) continue
        const profit = won
          ? +(bet.stake * (bet.odds - 1)).toFixed(2)
          : -bet.stake
        return { status: won ? 'laimeta' : 'pralaimeta', profit }
      }
    }
  }
  return null
}
