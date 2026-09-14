import type { LivePrice, LiveSignal } from '@/lib/live-signals'

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
export function betPayload(signal: LiveSignal, price: LivePrice, stake: number) {
  const names = splitEvent(price.eventName)
  const home = names?.[0] ?? signal.home ?? ''
  const away = names?.[1] ?? signal.away ?? ''
  const side = signal.direction
  const pickName = signal.market === 'total' ? null : side === 'home' ? home : side === 'away' ? away : null
  return {
    signalId: signal.id,
    sport: signal.sport.toUpperCase(),
    match: `${home} vs ${away}`,
    betDescription: price.selectionLabel,
    bookmaker: price.book,
    odds: price.odds,
    stake,
    marketType: signal.market,
    pickName,
    line: signal.line,
    homeName: home,
    awayName: away,
    gameKey: signal.id,
    startsAt: signal.startsAt,
  }
}

export async function trackBet(
  signal: LiveSignal,
  price: LivePrice,
  stake: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(betPayload(signal, price, stake)),
    })
    if (!response.ok) return { ok: false, error: 'Nepavyko pažymėti statymo. Bandyk dar kartą.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Nepavyko pasiekti serverio. Patikrink ryšį.' }
  }
}
