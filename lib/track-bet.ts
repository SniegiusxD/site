import type { LivePrice, LiveSignal } from '@/lib/live-signals'
import type { ActiveBet } from '@/lib/types'

/** Markets the existing auto-settlement (lib/bet-grader.ts) can grade. */
export const GRADABLE_MARKETS = new Set(['moneyline', 'spread', 'total'])

function splitEvent(eventName: string): [string, string] | null {
  const parts = eventName.split(' – ')
  return parts.length === 2 ? [parts[0].trim(), parts[1].trim()] : null
}

/**
 * The /api/bets body for a bet placed from a live signal. Names follow the
 * book the user bet at; the grader matches names loosely, so any spelling works.
 */
export type Placement = 'accepted' | 'limited' | 'rejected'

export function betPayload(
  signal: LiveSignal,
  price: LivePrice,
  stake: number,
  /** What the book actually gave, when it differed from the screen. */
  actual?: { odds?: number; stake?: number; placement?: Placement },
) {
  const names = splitEvent(price.eventName)
  const home = names?.[0] ?? signal.home ?? ''
  const away = names?.[1] ?? signal.away ?? ''
  const side = signal.direction
  const pickName = side === 'home' || side?.startsWith('home_') ? home : side === 'away' || side?.startsWith('away_') ? away : null
  return {
    signalId: signal.id,
    sport: signal.sport.toUpperCase(),
    match: `${home} vs ${away}`,
    betDescription: price.selectionLabel,
    bookmaker: price.book,
    odds: actual?.odds ?? price.odds,
    stake: actual?.stake ?? stake,
    shownOdds: price.odds,
    shownStake: stake,
    placement: actual?.placement ?? 'accepted',
    capturedAt: price.capturedAt,
    marketType: signal.market,
    pickName,
    line: signal.line,
    homeName: home,
    awayName: away,
    // A game key groups different lines on one fixture. A signal id identifies
    // one selection, so use Pinnacle's shared event identity when available.
    gameKey: signal.eventKey ?? signal.id,
    startsAt: signal.startsAt,
    entryFairProb: signal.fairProb,
    // Kept with the bet so the tracker can separate exact lines from
    // interpolated ones later, when the results are in.
    fairPriceInterpolated: price.fairPriceInterpolated ?? null,
    eventKey: signal.eventKey,
  }
}

export async function trackBet(
  signal: LiveSignal,
  price: LivePrice,
  stake: number,
  actual?: { odds?: number; stake?: number; placement?: Placement },
): Promise<{ ok: true; bet: ActiveBet } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(betPayload(signal, price, stake, actual)),
    })
    const body = await response.json().catch(() => null)
    if (!response.ok || !body?.bet) {
      return { ok: false, error: body?.error ?? 'Nepavyko pažymėti statymo. Bandyk dar kartą.' }
    }
    return { ok: true, bet: body.bet as ActiveBet }
  } catch {
    return { ok: false, error: 'Nepavyko pasiekti serverio. Patikrink ryšį.' }
  }
}
