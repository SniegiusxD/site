import type { Bookmaker, Signal, Sport } from "./types"

/** Raw opportunity from Flask /api/opportunities */
export interface BackendOpportunity {
  sport: string
  bookmaker: string
  type?: string
  game_signature?: string
  teams?: { home?: string; away?: string }
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
  MMA: "BASKETBALL",
  baseball_mlb: "BASEBALL",
  basketball_nba: "NBA",
  basketball_wnba: "BASKETBALL",
  americanfootball_nfl: "BASKETBALL",
}

function normalizeBookmaker(raw: string): Bookmaker {
  if (raw.toLowerCase().includes("top")) return "TopSport"
  return "7BET"
}

export function formatTimeUntil(startsAt: string | undefined): string {
  if (!startsAt) return "—"
  const diffMs = new Date(startsAt).getTime() - Date.now()
  if (diffMs <= 0) return "Pradėta"
  const mins = Math.floor(diffMs / 60_000)
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  if (hrs > 0) return `${hrs} val ${rem} min`
  return `${mins} min`
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

export function mapOpportunity(opp: BackendOpportunity, bankroll = 1247): Signal {
  const edgePct = (opp.edge ?? 0) * 100
  const kellyPct = (opp.kelly_fraction ?? 0) * 100
  const stake = Math.max(3, Math.round(bankroll * (opp.kelly_fraction ?? 0.01)))
  const sharpOdds =
    opp.sharp_odds ?? (opp.pinnacle_true_prob ? 1 / opp.pinnacle_true_prob : undefined)

  return {
    id: makeId(opp),
    category: "AGGREGATOR",
    sport: SPORT_MAP[opp.sport] ?? "BASKETBALL",
    match: opp.game_signature ?? "Unknown",
    betDescription: buildBetDescription(opp),
    bookmaker: normalizeBookmaker(opp.bookmaker),
    odds: opp.soft_odds,
    stake,
    timeUntil: formatTimeUntil(opp.starts_at),
    confidence: Math.min(95, Math.round(opp.match_confidence ?? edgePct * 3)),
    edgePercent: +edgePct.toFixed(1),
    kellyPercent: +kellyPct.toFixed(1),
    rationale: buildRationale(opp, edgePct, sharpOdds),
    sharpOdds,
    sharpBook: "Pinnacle",
  }
}

export function mapOpportunities(opps: BackendOpportunity[], bankroll = 1247): Signal[] {
  return opps.map((o) => mapOpportunity(o, bankroll))
}
