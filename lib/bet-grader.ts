/**
 * Auto-settle pending bets using ESPN public scoreboards.
 * Moneyline: winner. Spread/total: final scores vs line. BTTS: both scored.
 * Tennis game spread/total (#33b): sum ESPN linescores per set (ATP/WTA only).
 * Tennis ITF/Challenger (#39): Flashscore results fallback when ESPN misses.
 */

import {
  findFlashscoreFixture,
  loadFlashscoreResults,
} from '@/lib/flashscore-results'
import {
  findMultisportFixture,
  loadMultisportResults,
} from '@/lib/flashscore-multisport'
import {
  findPlayerStat,
  loadMlbStats,
  MLB_MARKET_TO_STAT,
} from '@/lib/mlb-stats'

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
  placedAt?: Date | null
  stake: number
  odds: number
}

export type GradeResult = {
  status: 'laimeta' | 'pralaimeta' | 'grazinta'
  profit: number
}

const GRACE_MS = 3 * 60 * 60 * 1000 // 3h after scheduled start

/** Kickoff for grace/unresolved — never use "now" when startsAt missing (that blocks forever). */
function kickoffTime(bet: BetForGrading): Date {
  if (bet.startsAt) return bet.startsAt
  if (bet.placedAt) return bet.placedAt
  return new Date(0)
}

function pastGrace(bet: BetForGrading): boolean {
  return Date.now() >= kickoffTime(bet).getTime() + GRACE_MS
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Significant name tokens (tennis Flashscore uses "Last F." vs full names). */
function nameTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3)
}

function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  const sa = slug(a)
  const sb = slug(b)
  if (sa.length < 3 || sb.length < 3) return sa === sb
  if (sa.includes(sb) || sb.includes(sa)) return true
  // Tennis / Flashscore: match on shared surname token (e.g. Kitahara ↔ Kitahara Y.)
  const ta = nameTokens(a)
  const tb = nameTokens(b)
  return ta.some((t) => tb.some((u) => t.includes(u) || u.includes(t)))
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

// --- #33b tennis game totals/spreads via ESPN linescores -------------------
// Tennis events nest matches under event.groupings[].competitions[], NOT the
// team-sport competitions[0] path. Each competitor has linescores:[{value}]
// where value = games won that set. Game total = sum of all set values.

type EspnTennisCompetitor = {
  winner?: boolean
  athlete?: { displayName?: string }
  linescores?: Array<{ value?: number }>
}
type EspnTennisComp = {
  status?: { type?: { completed?: boolean; state?: string } }
  competitors?: EspnTennisCompetitor[]
}
type EspnTennisEvent = { groupings?: Array<{ competitions?: EspnTennisComp[] }> }

function tennisGames(c: EspnTennisCompetitor): number | null {
  if (!c.linescores?.length) return null
  let sum = 0
  for (const ls of c.linescores) {
    if (typeof ls.value !== 'number') return null // incomplete → unsafe to grade
    sum += ls.value
  }
  return sum
}

/**
 * Resolve a finished ESPN tennis match to our fixture, oriented to our home.
 * Returns per-player GAME counts (never set scores). null if not found/finished.
 */
function resolveTennisGames(
  events: EspnTennisEvent[],
  homeHint: string,
  awayHint: string,
): { homeGames: number; awayGames: number; homeName: string; awayName: string } | null {
  for (const ev of events) {
    for (const g of ev.groupings ?? []) {
      for (const c of g.competitions ?? []) {
        const st = c.status?.type
        if (!(st?.completed === true || st?.state === 'post')) continue
        const comps = c.competitors
        if (!comps || comps.length < 2) continue
        const p0 = comps[0]
        const p1 = comps[1]
        const n0 = p0.athlete?.displayName ?? ''
        const n1 = p1.athlete?.displayName ?? ''
        const g0 = tennisGames(p0)
        const g1 = tennisGames(p1)
        if (g0 == null || g1 == null) continue

        // orient onto our fixture
        const direct = namesMatch(homeHint, n0) || namesMatch(awayHint, n1)
        const swap = namesMatch(homeHint, n1) || namesMatch(awayHint, n0)
        if (!direct && !swap) continue
        if (swap && !direct) {
          return { homeGames: g1, awayGames: g0, homeName: n1, awayName: n0 }
        }
        return { homeGames: g0, awayGames: g1, homeName: n0, awayName: n1 }
      }
    }
  }
  return null
}

/**
 * #33b grade a tennis GAME spread/total from ESPN linescores (ATP+WTA).
 * Spread: pick-side game margin + line. Total: combined games vs line.
 * Never derived from set score. Returns null if the match isn't found yet.
 */
async function gradeTennisLine(
  bet: BetForGrading,
  market: 'spread' | 'total',
): Promise<GradeResult | null> {
  if (bet.line == null) return null
  const parsed = parseMatchNames(bet.match)
  const homeHint = bet.homeName ?? parsed?.home ?? ''
  const awayHint = bet.awayName ?? parsed?.away ?? ''
  if (!homeHint && !awayHint) return null

  if (!pastGrace(bet)) return null

  const dates = [yyyymmdd(kickoffTime(bet))]
  const prev = new Date(kickoffTime(bet))
  prev.setUTCDate(prev.getUTCDate() - 1)
  dates.push(yyyymmdd(prev))

  const descLower = bet.betDescription.toLowerCase()
  for (const path of ['tennis/atp/scoreboard', 'tennis/wta/scoreboard']) {
    for (const date of dates) {
      let events: EspnTennisEvent[]
      try {
        events = (await fetchEspnEvents(path, date)) as unknown as EspnTennisEvent[]
      } catch {
        continue
      }
      const fx = resolveTennisGames(events, homeHint, awayHint)
      if (!fx) continue

      if (market === 'total') {
        const isOver = descLower.includes('daugiau') || descLower.includes('over')
        const out = gradeTotal(fx.homeGames + fx.awayGames, isOver, bet.line)
        return settle(out, bet)
      }
      // spread: which side did we back?
      const pickIsHome =
        namesMatch(bet.pickName ?? '', fx.homeName) || namesMatch(bet.pickName ?? '', homeHint)
      const pickIsAway =
        namesMatch(bet.pickName ?? '', fx.awayName) || namesMatch(bet.pickName ?? '', awayHint)
      if (!pickIsHome && !pickIsAway) continue
      const out = gradeSpread(fx.homeGames, fx.awayGames, pickIsHome, bet.line)
      return settle(out, bet)
    }
  }
  return null
}


/** #39 — grade tennis from Flashscore when ESPN has no match (ITF/Challenger). */
async function tryGradeTennisFromFlashscore(
  bet: BetForGrading,
  market: string,
): Promise<GradeResult | null> {
  const parsed = parseMatchNames(bet.match)
  const homeHint = bet.homeName ?? parsed?.home ?? ''
  const awayHint = bet.awayName ?? parsed?.away ?? ''
  if (!homeHint && !awayHint) return null

  if (!pastGrace(bet)) return null

  const results = await loadFlashscoreResults()
  const fx = findFlashscoreFixture(results, homeHint, awayHint, namesMatch)
  if (!fx) return null

  const pickName =
    bet.pickName ?? extractPickName(bet.betDescription, bet.marketType)
  const descLower = bet.betDescription.toLowerCase()

  if (market === 'moneyline') {
    if (!pickName) return null
    const pickIsHome =
      namesMatch(pickName, fx.homeName) || namesMatch(pickName, homeHint)
    const pickIsAway =
      namesMatch(pickName, fx.awayName) || namesMatch(pickName, awayHint)
    if (!pickIsHome && !pickIsAway) return null
    const won = pickIsHome ? fx.homeWon : !fx.homeWon
    return settle(won, bet)
  }

  if ((market === 'spread' || market === 'total') && bet.line == null) return null

  if (market === 'total') {
    const isOver = descLower.includes('daugiau') || descLower.includes('over')
    const out = gradeTotal(fx.homeGames + fx.awayGames, isOver, bet.line as number)
    return settle(out, bet)
  }

  if (market === 'spread') {
    const pickIsHome =
      namesMatch(pickName ?? '', fx.homeName) || namesMatch(pickName ?? '', homeHint)
    const pickIsAway =
      namesMatch(pickName ?? '', fx.awayName) || namesMatch(pickName ?? '', awayHint)
    if (!pickIsHome && !pickIsAway) return null
    const out = gradeSpread(fx.homeGames, fx.awayGames, pickIsHome, bet.line as number)
    return settle(out, bet)
  }

  return null
}


/** Map our Sport enum → Flashscore multisport key (or null if not covered). */
function multisportKey(sport: string): string | null {
  const s = sport.toUpperCase()
  if (s === 'VOLLEYBALL') return 'volleyball'
  if (s === 'ICE_HOCKEY') return 'hockey'
  if (s === 'CRICKET') return 'cricket'
  // Non-NBA basketball (Euroleague, etc.) — ESPN often lacks these.
  if (s === 'BASKETBALL') return 'basketball'
  return null
}

/**
 * Phase 7 — grade volleyball / obscure-basketball / hockey / cricket from
 * Flashscore when ESPN has no match. Moneyline + spread + total.
 * Cricket only supports moneyline (winner-only; no reliable run line).
 */
async function tryGradeFromMultisport(
  bet: BetForGrading,
  market: string,
): Promise<GradeResult | null> {
  const key = multisportKey(bet.sport)
  if (!key) return null
  if (!pastGrace(bet)) return null

  const parsed = parseMatchNames(bet.match)
  const homeHint = bet.homeName ?? parsed?.home ?? ''
  const awayHint = bet.awayName ?? parsed?.away ?? ''
  if (!homeHint && !awayHint) return null

  const bySport = await loadMultisportResults()
  const results = bySport[key] ?? []
  if (!results.length) return null

  const fx = findMultisportFixture(results, homeHint, awayHint, namesMatch)
  if (!fx) return null

  const pickName = bet.pickName ?? extractPickName(bet.betDescription, bet.marketType)
  const descLower = bet.betDescription.toLowerCase()

  if (market === 'moneyline') {
    if (!pickName) return null
    const pickIsHome = namesMatch(pickName, fx.homeName) || namesMatch(pickName, homeHint)
    const pickIsAway = namesMatch(pickName, fx.awayName) || namesMatch(pickName, awayHint)
    if (!pickIsHome && !pickIsAway) return null
    const won = pickIsHome ? fx.homeWon : !fx.homeWon
    return settle(won, bet)
  }

  // spread / total need numeric scores
  if (!fx.hasScores || bet.line == null) return null
  if (key === 'cricket') return null // no reliable run line — moneyline only

  if (market === 'total') {
    const isOver = descLower.includes('daugiau') || descLower.includes('over')
    const out = gradeTotal(fx.homeScore + fx.awayScore, isOver, bet.line)
    return settle(out, bet)
  }

  if (market === 'spread') {
    const pickIsHome = namesMatch(pickName ?? '', fx.homeName) || namesMatch(pickName ?? '', homeHint)
    const pickIsAway = namesMatch(pickName ?? '', fx.awayName) || namesMatch(pickName ?? '', awayHint)
    if (!pickIsHome && !pickIsAway) return null
    const out = gradeSpread(fx.homeScore, fx.awayScore, pickIsHome, bet.line)
    return settle(out, bet)
  }

  return null
}

/**
 * Phase 7 — grade an MLB player prop from ESPN box-score stats.
 * Compares the player's actual stat (hits / HR / TB / RBI / K) to the line.
 */
async function tryGradeMlbProp(bet: BetForGrading): Promise<GradeResult | null> {
  if (bet.line == null) return null
  if (!pastGrace(bet)) return null

  // Determine market + player. Backend prop bets carry pickName as the player
  // when available; market is encoded in betDescription / pickName.
  const market = propMarketFromBet(bet)
  if (!market || !MLB_MARKET_TO_STAT[market]) return null
  const player = propPlayerFromBet(bet)
  if (!player) return null

  const players = await loadMlbStats()
  if (!players.length) return null

  const found = findPlayerStat(players, player, market, namesMatch)
  if (!found) return null

  // Over/under side from description ("Daugiau"/"over" = over).
  const descLower = bet.betDescription.toLowerCase()
  const isOver = descLower.includes('daugiau') || descLower.includes('over')
  const out = gradeTotal(found.value, isOver, bet.line)
  return settle(out, bet)
}

/** Pull the MLB prop market key from a bet (description or pickName). */
function propMarketFromBet(bet: BetForGrading): string | null {
  const hay = `${bet.betDescription} ${bet.pickName ?? ''}`.toLowerCase()
  if (/strikeout|striks|k's|\bk\b/.test(hay)) return 'pitcher_strikeouts'
  if (/home run|homerun|\bhr\b/.test(hay)) return 'batter_home_runs'
  if (/total base/.test(hay)) return 'batter_total_bases'
  if (/\brbi/.test(hay)) return 'batter_rbis'
  if (/\bhit/.test(hay)) return 'batter_hits'
  return null
}

/**
 * Extract the player name from a prop bet. Backend prop descriptions look like
 * "Pete Alonso: Over 1.5 (batter hits)" — take the part before the colon.
 */
function propPlayerFromBet(bet: BetForGrading): string | null {
  if (bet.pickName && /[a-z]/i.test(bet.pickName) && !/^(over|under|daugiau|mažiau|maziau)/i.test(bet.pickName.trim())) {
    // pickName may already be the player
    const colon = bet.pickName.split(':')[0].trim()
    if (colon.split(/\s+/).length >= 2) return colon
  }
  const desc = bet.betDescription
  const colonIdx = desc.indexOf(':')
  if (colonIdx > 0) {
    const candidate = desc.slice(0, colonIdx).trim()
    if (candidate.split(/\s+/).length >= 2) return candidate
  }
  return null
}

/** Why a bet could not be graded (admin/cron debug). */
export async function diagnoseBetBlocker(bet: BetForGrading): Promise<string> {
  const market = (bet.marketType ?? 'moneyline').toLowerCase()
  const sportU = bet.sport.toUpperCase()

  if (!pastGrace(bet)) {
    const ko = kickoffTime(bet)
    return `waiting_3h_after_kickoff (kickoff ${ko.toISOString()})`
  }

  // Player props (Phase 7) — MLB via ESPN box scores.
  if (market === 'prop') {
    if (sportU !== 'BASEBALL' && sportU !== 'MLB') return `prop_no_source_for_${sportU}`
    if (bet.line == null) return 'missing_line'
    const mkt = propMarketFromBet(bet)
    if (!mkt) return 'prop_unknown_market'
    const player = propPlayerFromBet(bet)
    if (!player) return 'prop_missing_player_name'
    const players = await loadMlbStats()
    if (!players.length) return 'mlb_stats_fetch_empty'
    const found = findPlayerStat(players, player, mkt, namesMatch)
    if (!found) return 'no_mlb_stat_for_player (check name / game finished)'
    return 'mlb_stat_found_but_not_graded'
  }

  if ((market === 'spread' || market === 'total') && bet.line == null) {
    return 'missing_line'
  }

  const pickName =
    bet.pickName ?? extractPickName(bet.betDescription, bet.marketType)
  if (market === 'moneyline' && !pickName) return 'missing_pick_name'

  const parsed = parseMatchNames(bet.match)
  const homeHint = bet.homeName ?? parsed?.home ?? ''
  const awayHint = bet.awayName ?? parsed?.away ?? ''
  if (!homeHint && !awayHint) return 'missing_player_names'

  if (sportU === 'TABLE_TENNIS') return 'table_tennis_no_source'

  if (sportU === 'TENNIS') {
    const fs = await loadFlashscoreResults()
    if (!fs.length) return 'flashscore_fetch_empty'
    const fx = findFlashscoreFixture(fs, homeHint, awayHint, namesMatch)
    if (!fx) return 'no_flashscore_match (check name spelling / match age)'
    return 'flashscore_found_but_market_not_graded'
  }

  // Phase 7 — sports covered by Flashscore multisport fallback.
  const msKey = multisportKey(bet.sport)
  const paths = espnPathsForSport(bet.sport)
  if (msKey) {
    const bySport = await loadMultisportResults()
    const results = bySport[msKey] ?? []
    if (!results.length && !paths.length) return `multisport_fetch_empty_${sportU}`
    const fx = findMultisportFixture(results, homeHint, awayHint, namesMatch)
    if (!fx && !paths.length) return 'no_multisport_match (check name / match age)'
    if (fx && msKey === 'cricket' && market !== 'moneyline') return 'cricket_line_unsupported'
    if (fx && !fx.hasScores && market !== 'moneyline') return 'multisport_scores_missing'
    if (fx) return 'multisport_found_but_market_not_graded'
  }

  if (!paths.length && sportU !== 'TENNIS') {
    return `no_espn_feed_for_${sportU}`
  }

  return 'no_espn_match'
}


export async function tryGradeBet(bet: BetForGrading): Promise<GradeResult | null> {
  const market = (bet.marketType ?? 'moneyline').toLowerCase()
  // Player props (Phase 7): MLB via ESPN box scores. Other sports' props have
  // no public stat source yet → stay pending.
  if (market === 'prop') {
    const sportU0 = bet.sport.toUpperCase()
    if (sportU0 === 'BASEBALL' || sportU0 === 'MLB') {
      return tryGradeMlbProp(bet)
    }
    return null
  }
  // Tennis totals/spreads: ESPN tennis scoreboard has no game-count totals → manual.
  const sportU = bet.sport.toUpperCase()
  const isTennis = sportU === 'TENNIS' || sportU === 'TABLE_TENNIS'
  if (isTennis && (market === 'spread' || market === 'total')) {
    if (sportU !== 'TENNIS') return null // table tennis: no ESPN linescores
    const espn = await gradeTennisLine(bet, market)
    if (espn) return espn
    return tryGradeTennisFromFlashscore(bet, market)
  }
  if (isTennis && market !== 'moneyline') {
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

  if (!pastGrace(bet)) return null

  const dates = [yyyymmdd(kickoffTime(bet))]
  const prev = new Date(kickoffTime(bet))
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

  // #39 Flashscore fallback for tennis moneyline (ITF/Challenger ESPN gaps)
  if (sportU === 'TENNIS' && market === 'moneyline') {
    const fb = await tryGradeTennisFromFlashscore(bet, market)
    if (fb) return fb
  }

  // Phase 7 — Flashscore multisport fallback (volleyball / obscure basketball /
  // hockey / cricket) when ESPN had no usable match.
  const multi = await tryGradeFromMultisport(bet, market)
  if (multi) return multi

  return null
}
