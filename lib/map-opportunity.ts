import type { Bookmaker, Signal, Sport } from "./types"
import { extractPickName } from "./bet-grader"
import { formatTimeUntil } from "./format"

export { formatTimeUntil }

/** Raw opportunity from Flask /api/opportunities */
export interface BackendOpportunity {
  sport: string
  bookmaker: string
  type?: string
  game_signature?: string
  game_key?: string
  teams?: { home?: string; away?: string; player1?: string; player2?: string }
  starts_at?: string
  pick?: string
  soft_odds: number
  sharp_odds?: number
  edge: number
  kelly_fraction: number
  expected_value?: number
  pinnacle_true_prob?: number
  description?: string
  player?: string
  market?: string
  line?: number
  match_confidence?: number
  timestamp?: string
}

const SPORT_MAP: Record<string, Sport> = {
  TENNIS: "TENNIS",
  BASEBALL: "BASEBALL",
  BASKETBALL: "BASKETBALL",
  SOCCER: "SOCCER",
  NBA: "NBA",
  MLB: "MLB",
  // R3a: aggregator-unlocked sports — map to their own Sport instead of
  // falling through to BASKETBALL.
  MMA: "MMA",
  FOOTBALL: "FOOTBALL",
  ICE_HOCKEY: "ICE_HOCKEY",
  HANDBALL: "HANDBALL",
  VOLLEYBALL: "VOLLEYBALL",
  RUGBY_LEAGUE: "RUGBY_LEAGUE",
  RUGBY: "RUGBY",
  BOXING: "BOXING",
  CRICKET: "CRICKET",
  AMERICAN_FOOTBALL: "AMERICAN_FOOTBALL",
  TABLE_TENNIS: "TABLE_TENNIS",
  baseball_mlb: "BASEBALL",
  basketball_nba: "NBA",
  basketball_wnba: "BASKETBALL",
  americanfootball_nfl: "AMERICAN_FOOTBALL",
}

function normalizeBookmaker(raw: string): Bookmaker {
  if (raw.toLowerCase().includes("top")) return "TopSport"
  return "7BET"
}

function makeId(opp: BackendOpportunity): string {
  const key = [opp.bookmaker, opp.game_signature, opp.pick, opp.player]
    .filter(Boolean)
    .join("-")
  return key.replace(/\s+/g, "-").slice(0, 80)
}

function buildBetDescription(opp: BackendOpportunity): string {
  if (opp.type === "prop" && opp.player) {
    const market = opp.market?.replace(/_/g, " ") ?? "prop"
    return `${opp.player}: ${opp.pick} (${market})`
  }
  return opp.description ?? opp.pick ?? "moneyline"
}

function buildRationale(opp: BackendOpportunity, edgePct: number, sharpOdds?: number): string {
  if (sharpOdds) {
    return `Pinnacle ${sharpOdds.toFixed(2)}, ${opp.bookmaker} ${opp.soft_odds.toFixed(2)} — ${edgePct.toFixed(1)}% vertė.`
  }
  return opp.description ?? ""
}

/**
 * Parse a betting line (and over/under side for totals) from a Lithuanian
 * description when the backend did not send an explicit `line`.
 *
 * Handles:
 *   "Suminis: Daugiau 173.5"      → { line: 173.5, side: "over" }
 *   "Mažiau 0.5"                  → { line: 0.5,   side: "under" }
 *   "Handikapas: Team -4.5"       → { line: -4.5 }
 *   "Team (-13)"                  → { line: -13 }  (line in parentheses)
 *   "Samuel Basallo: Mažiau 0.5"  → { line: 0.5,   side: "under" } (prop)
 *
 * "Daugiau"/"Virš" = Over, "Mažiau" = Under.
 */
export function parseLineFromDescription(
  description: string,
): { line?: number; side?: "over" | "under" } {
  if (!description) return {}
  const lower = description.toLowerCase()
  let side: "over" | "under" | undefined
  if (/\b(daugiau|vir[sš]|over)\b/.test(lower)) side = "over"
  else if (/\b(ma[zž]iau|under)\b/.test(lower)) side = "under"

  // Prefer a number inside parentheses, e.g. "Team (-13)" or "(+4.5)"
  const paren = description.match(/\(\s*([+-]?\d+(?:[.,]\d+)?)\s*\)/)
  if (paren) {
    return { line: Number(paren[1].replace(",", ".").replace("+", "")), side }
  }

  // A number immediately after the over/under keyword, e.g. "Over 1.5 (...)"
  const afterSide = description.match(
    /(?:daugiau|vir[sš]|over|ma[zž]iau|under)\s*([+-]?\d+(?:[.,]\d+)?)/i,
  )
  if (afterSide) {
    return { line: Number(afterSide[1].replace(",", ".").replace("+", "")), side }
  }

  // Otherwise the last signed/decimal number in the string
  const m = description.match(/([+-]?\d+(?:[.,]\d+)?)\s*$/)
  if (m) {
    return { line: Number(m[1].replace(",", ".").replace("+", "")), side }
  }
  return { side }
}

/** Backend `kelly_fraction` is already quarter-Kelly (see edge_detector.py). */
export function mapOpportunity(opp: BackendOpportunity, bankroll = 1247): Signal {
  const edgePct = (opp.edge ?? 0) * 100
  const kellyFrac = opp.kelly_fraction ?? 0
  const kellyPct = kellyFrac * 100
  const stake = Math.min(50, Math.max(3, Math.round(bankroll * kellyFrac)))
  const sharpOdds =
    opp.sharp_odds ?? (opp.pinnacle_true_prob ? 1 / opp.pinnacle_true_prob : undefined)
  const betDescription = buildBetDescription(opp)
  const marketType = opp.type ?? "moneyline"
  const homeName =
    opp.teams?.home ?? opp.teams?.player1 ?? undefined
  const awayName =
    opp.teams?.away ?? opp.teams?.player2 ?? undefined
  const pickName =
    extractPickName(betDescription, marketType) ??
    (marketType === "moneyline" ? betDescription.replace(/\s*moneyline\s*$/i, "").trim() : undefined)
  // Line for spread/total/prop: backend sends opp.line; otherwise parse it
  // (and the over/under side) from the Lithuanian description.
  let line: number | undefined = opp.line ?? undefined
  if (line == null && (marketType === "spread" || marketType === "total" || marketType === "prop")) {
    const parsed = parseLineFromDescription(betDescription)
    if (parsed.line != null) line = parsed.line
  }

  return {
    id: makeId(opp),
    category: "AGGREGATOR",
    // R3a: case-insensitive map; unknown sports get a neutral OTHER chip
    // instead of being mislabelled as BASKETBALL.
    sport: SPORT_MAP[opp.sport] ?? SPORT_MAP[(opp.sport ?? "").toUpperCase()] ?? "OTHER",
    match: opp.game_signature ?? "Unknown",
    betDescription,
    bookmaker: normalizeBookmaker(opp.bookmaker),
    odds: opp.soft_odds,
    stake,
    timeUntil: formatTimeUntil(opp.starts_at),
    startsAt: opp.starts_at,
    confidence: Math.min(95, Math.round(opp.match_confidence ?? edgePct * 3)),
    edgePercent: +edgePct.toFixed(1),
    kellyPercent: +kellyPct.toFixed(1),
    rationale: buildRationale(opp, edgePct, sharpOdds),
    sharpOdds,
    sharpBook: "Pinnacle",
    marketType,
    pickName: pickName || undefined,
    line,
    gameKey: opp.game_key,
    homeName,
    awayName,
  }
}

export function mapOpportunities(opps: BackendOpportunity[], bankroll = 1247): Signal[] {
  return opps.map((o) => mapOpportunity(o, bankroll))
}
