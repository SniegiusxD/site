/**
 * Auto-settle pending bets using ESPN public scoreboards.
 * Moneyline: winner. Spread/total: final scores vs line. BTTS: both scored.
 * Tennis totals stay pending (ESPN tennis has no game-count score) — manual.
 */

export type BetForGrading = {
  id: string
  sport: string
  match: string
  betDescription: string
  marketType: string
  pickName: string | null
  line: number | null
  homeName: string | null
  awayName: string | null
  startsAt: Date | null
  stake: number
  odds: number
}

export type GradeResult = {
  status: 'laimeta' | 'pralaimeta' | 'grazinta'
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
  score?: string | number
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

function toScore(c: EspnCompetitor): number | null {
  if (c.score == null) return null
  const n = typeof c.score === 'number' ? c.score : parseFloat(c.score)
  return Number.isFinite(n) ? n : null
}

/**
 * Resolve a finished ESPN event to our fixture and return both sides oriented
 * to OUR home/away (homeHint = our home). Returns scores for line grading.
 * `swapped` = true when ESPN's home is our away.
 */
function resolveFixture(
  ev: EspnEvent,
  homeHint: string,
  awayHint: string,
): { homeScore: number; awayScore: number; eHomeName: string; eAwayName: string } | null {
  const comp = ev.competitions?.[0]
  if (!comp?.competitors?.length || !eventFinished(ev)) return null
  const comps = comp.competitors
  let eHome = comps.find((c) => c.homeAway === 'home') ?? comps[0]
  let eAway = comps.find((c) => c.homeAway === 'away') ?? comps[1]
  if (!eHome || !eAway) return null

  const eHomeName = competitorName(eHome)
  const eAwayName = competitorName(eAway)
  const hs = toScore(eHome)
  const as = toScore(eAway)
  if (hs == null || as == null) return null

  // Orient ESPN sides onto our fixture (ESPN order may differ).
  const direct =
    (namesMatch(homeHint, eHomeName) || namesMatch(awayHint, eAwayName)) &&
    !(namesMatch(homeHint, eAwayName) || namesMatch(awayHint, eHomeName))
  const swap =
    (namesMatch(homeHint, eAwayName) || namesMatch(awayHint, eHomeName)) &&
    !(namesMatch(homeHint, eHomeName) || namesMatch(awayHint, eAwayName))
  if (!direct && !swap) {
    // weak fallback: require at least one side to match in direct order
    if (!namesMatch(homeHint, eHomeName) && !namesMatch(awayHint, eAwayName)) return null
  }
  if (swap) {
    return { homeScore: as, awayScore: hs, eHomeName: eAwayName, eAwayName: eHomeName }
  }
  return { homeScore: hs, awayScore: as, eHomeName, eAwayName }
}

/** win=true / lose=false / push=null for a spread on OUR pick side. */
function gradeSpread(
  homeScore: number,
  awayScore: number,
  pickIsHome: boolean,
  line: number,
): boolean | null {
  // line is the handicap for the PICK side. Covered if (pickScore - oppScore) + line > 0.
  const margin = pickIsHome ? homeScore - awayScore : awayScore - homeScore
  const adj = margin + line
  if (Math.abs(adj) < 1e-9) return null // push
  return adj > 0
}

/** win=true / lose=false / push=null for over/under. */
function gradeTotal(total: number, isOver: boolean, line: number): boolean | null {
  if (Math.abs(total - line) < 1e-9) return null // push
  return isOver ? total > line : total < line
}


function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function settle(outcome: boolean | null, bet: BetForGrading): GradeResult {
  if (outcome === null) return { status: 'grazinta', profit: 0 } // push → stake back
  return outcome
    ? { status: 'laimeta', profit: +(bet.stake * (bet.odds - 1)).toFixed(2) }
    : { status: 'pralaimeta', profit: -bet.stake }
}

export async function tryGradeBet(bet: BetForGrading): Promise<GradeResult | null> {
  const market = (bet.marketType ?? 'moneyline').toLowerCase()
  // Tennis totals/spreads: ESPN tennis scoreboard has no game-count totals → manual.
  const sportU = bet.sport.toUpperCase()
  if ((sportU === 'TENNIS' || sportU === 'TABLE_TENNIS') && market !== 'moneyline') {
    return null
  }

  const parsed = parseMatchNames(bet.match)
  const homeHint = bet.homeName ?? parsed?.home ?? ''
  const awayHint = bet.awayName ?? parsed?.away ?? ''
  if (!homeHint && !awayHint) return null

  // markets that need a numeric line must have one
  if ((market === 'spread' || market === 'total') && bet.line == null) return null

  const pickName =
    bet.pickName ?? extractPickName(bet.betDescription, bet.marketType)
  if (market === 'moneyline' && !pickName) return null

  const start = bet.startsAt ?? new Date()
  if (Date.now() < start.getTime() + GRACE_MS) return null

  const dates = [yyyymmdd(start)]
  const prev = new Date(start)
  prev.setUTCDate(prev.getUTCDate() - 1)
  dates.push(yyyymmdd(prev))

  const paths = espnPathsForSport(bet.sport)
  if (!paths.length) return null

  const descLower = bet.betDescription.toLowerCase()

  for (const path of paths) {
    for (const date of dates) {
      let events: EspnEvent[]
      try {
        events = await fetchEspnEvents(path, date)
      } catch {
        continue
      }
      for (const ev of events) {
        if (market === 'moneyline') {
          const won = gradeFromEspnEvent(ev, pickName ?? '', homeHint, awayHint)
          if (won === null) continue
          return settle(won, bet)
        }

        // spread / total / btts all need oriented scores
        const fx = resolveFixture(ev, homeHint, awayHint)
        if (!fx) continue

        if (market === 'spread') {
          // pick side: which team did we back? (pickName vs our home/away hints)
          const pickIsHome =
            namesMatch(pickName ?? '', fx.eHomeName) ||
            namesMatch(pickName ?? '', homeHint)
          const pickIsAway =
            namesMatch(pickName ?? '', fx.eAwayName) ||
            namesMatch(pickName ?? '', awayHint)
          if (!pickIsHome && !pickIsAway) continue
          const out = gradeSpread(fx.homeScore, fx.awayScore, pickIsHome, bet.line as number)
          return settle(out, bet)
        }

        if (market === 'total') {
          const isOver = descLower.includes('daugiau') || descLower.includes('over')
          const out = gradeTotal(fx.homeScore + fx.awayScore, isOver, bet.line as number)
          return settle(out, bet)
        }

        if (market === 'btts') {
          const isYes = descLower.includes('taip') || descLower.includes('yes')
          const bothScored = fx.homeScore > 0 && fx.awayScore > 0
          return settle(isYes ? bothScored : !bothScored, bet)
        }
      }
    }
  }
  return null
}
