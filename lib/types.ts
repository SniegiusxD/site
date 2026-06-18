export type SportKey = "NBA" | "AGGREGATOR" | "PLAYER" | "MLB" | "MBA"

export type Sport =
  | "TENNIS"
  | "BASKETBALL"
  | "BASEBALL"
  | "SOCCER"
  | "NBA"
  | "MLB"
  // Sports unlocked in the aggregator backend (R3a). Backend emits these
  // uppercased keys; without them they all fell through to BASKETBALL.
  | "FOOTBALL"
  | "ICE_HOCKEY"
  | "HANDBALL"
  | "VOLLEYBALL"
  | "RUGBY_LEAGUE"
  | "RUGBY"
  | "BOXING"
  | "MMA"
  | "CRICKET"
  | "AMERICAN_FOOTBALL"
  | "TABLE_TENNIS"
  | "OTHER"

export type BetStatus = "laukia" | "laimeta" | "pralaimeta" | "grazinta"

export type Bookmaker =
  | "7BET"
  | "TopSport"
  | "Pinnacle"

/** A betting opportunity shown in the Signalai section. */
export interface Signal {
  id: string
  category: SportKey
  sport: Sport
  match: string
  betDescription: string
  bookmaker: Bookmaker
  odds: number
  stake: number
  timeUntil: string
  /** ISO start time for sorting (optional; undefined for mock data) */
  startsAt?: string
  /** AI / model confidence 0-100 */
  confidence: number
  /** detected value edge in % */
  edgePercent: number
  /** kelly suggested fraction of bankroll in % */
  kellyPercent: number
  /** short model rationale */
  rationale: string
  /** sharp reference line (e.g. Pinnacle) for multi-book value comparison */
  sharpOdds?: number
  /** sharp reference book name */
  sharpBook?: Bookmaker
  /** market type from backend */
  marketType?: string
  /** team/player picked (for auto-grade) */
  pickName?: string
  /** line for spread/total markets (e.g. -4.5 spread, 210.5 total); from description */
  line?: number
  /** game key for dedup */
  gameKey?: string
  homeName?: string
  awayName?: string
}

/** A bet that has been placed and is being tracked. */
export interface ActiveBet {
  id: string
  signalId: string
  sport: Sport
  match: string
  betDescription: string
  bookmaker: Bookmaker
  odds: number
  stake: number
  status: BetStatus
  placedAt: string
  /** realised profit/loss once settled, null while pending */
  profit: number | null
  /** moneyline | spread | total | btts */
  marketType?: string
  pickName?: string
  /** line for spread/total markets */
  line?: number
  startsAt?: string
}

export interface HistoryBet {
  id: string
  date: string
  sport: Sport
  match: string
  betDescription: string
  bookmaker: Bookmaker
  odds: number
  stake: number
  status: Exclude<BetStatus, "laukia">
  profit: number
}

export interface Kpi {
  label: string
  value: string
  delta?: string
  tone?: "pos" | "neg" | "neutral"
  hint?: string
}
