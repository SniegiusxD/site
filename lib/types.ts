export type SportKey = "NBA" | "AGGREGATOR" | "PLAYER" | "MLB" | "MBA"

export type Sport =
  | "TENNIS"
  | "BASKETBALL"
  | "BASEBALL"
  | "SOCCER"
  | "NBA"
  | "MLB"

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
