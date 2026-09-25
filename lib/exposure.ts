import { vilniusDay } from '@/lib/bets-calendar'
import type { LivePrice, LiveSignal } from '@/lib/live-signals'
import { type StakePrefs, suggestedStake } from '@/lib/preferences'
import type { ActiveBet } from '@/lib/types'

/** The fields the signal board needs from a tracked bet. */
export type BoardBet = {
  id: string
  signalId: string | null
  bookmaker: string
  stake: number
  odds: number
  /** Pinnacle fair probability when the bet was marked; null for older bets. */
  entryFairProb: number | null
  eventKey: string | null
  placedAt: string
}

export type DailyProgress = { count: number; staked: number; value: number }

export type Exposure = {
  /** Bets on this exact selection, at any book. */
  selection: { count: number; staked: number }
  /** Bets on other lines of the same match. */
  match: { count: number; staked: number }
}

const round2 = (value: number) => Math.round(value * 100) / 100

export function toBoardBet(bet: ActiveBet): BoardBet {
  return {
    id: bet.id,
    signalId: bet.signalId || null,
    bookmaker: bet.bookmaker,
    stake: bet.stake,
    odds: bet.odds,
    entryFairProb: bet.entryFairProb ?? null,
    eventKey: bet.eventKey ?? null,
    placedAt: bet.placedAtIso ?? new Date().toISOString(),
  }
}

/**
 * Bets marked since Vilnius midnight and the value they carry: the stake times
 * the edge at entry. Value is what the price was worth, not the result.
 */
export function dailyProgress(bets: BoardBet[], now: Date): DailyProgress {
  const today = vilniusDay(now)
  let count = 0
  let staked = 0
  let value = 0
  for (const bet of bets) {
    if (vilniusDay(bet.placedAt) !== today) continue
    count += 1
    staked += bet.stake
    if (bet.entryFairProb) value += bet.stake * (bet.odds * bet.entryFairProb - 1)
  }
  return { count, staked: round2(staked), value: round2(value) }
}

type MatchIdentity = { eventKey: string | null; names: string | null }

function identityOf(signal: Pick<LiveSignal, 'eventKey' | 'home' | 'away' | 'startsAt'>): MatchIdentity {
  const names = signal.home && signal.away ? `${signal.home}|${signal.away}|${signal.startsAt}`.toLowerCase() : null
  return { eventKey: signal.eventKey, names }
}

/** Pinnacle's event id when both sides have it, otherwise both names and the kickoff. */
function sameMatch(a: MatchIdentity, b: MatchIdentity): boolean {
  if (a.eventKey && b.eventKey) return a.eventKey === b.eventKey
  return Boolean(a.names && b.names && a.names === b.names)
}

/**
 * What the member already has riding on this signal. A bet whose signal left
 * the board and that carries no match key cannot be placed on a match, so it
 * is left out rather than guessed.
 */
export function exposureFor(signal: LiveSignal, bets: BoardBet[], signalsById: Map<string, LiveSignal>): Exposure {
  const exposure: Exposure = { selection: { count: 0, staked: 0 }, match: { count: 0, staked: 0 } }
  const target = identityOf(signal)
  for (const bet of bets) {
    if (bet.signalId === signal.id) {
      exposure.selection.count += 1
      exposure.selection.staked += bet.stake
      continue
    }
    const betSignal = bet.signalId ? signalsById.get(bet.signalId) : undefined
    const identity: MatchIdentity = betSignal
      ? { ...identityOf(betSignal), eventKey: bet.eventKey ?? betSignal.eventKey }
      : { eventKey: bet.eventKey, names: null }
    if (sameMatch(target, identity)) {
      exposure.match.count += 1
      exposure.match.staked += bet.stake
    }
  }
  exposure.selection.staked = round2(exposure.selection.staked)
  exposure.match.staked = round2(exposure.match.staked)
  return exposure
}

/**
 * The stake to suggest on the board. Kelly sizes one position per selection,
 * so a second bet on the same selection at another book only gets what is left
 * of that amount. The book limit still applies on top.
 */
export function boardStake(
  prefs: StakePrefs,
  signal: Pick<LiveSignal, 'fairOdds'>,
  price: Pick<LivePrice, 'book' | 'odds'>,
  exposure: Exposure,
) {
  const kelly = suggestedStake({ ...prefs, bookLimits: {} }, price.book, price.odds, signal.fairOdds)
  const withLimit = suggestedStake(prefs, price.book, price.odds, signal.fairOdds)
  const remaining = Math.max(0, Math.floor(kelly - exposure.selection.staked))
  return {
    kelly,
    remaining,
    suggested: Math.min(withLimit, remaining),
    directionFull: exposure.selection.staked > 0 && remaining === 0,
  }
}
