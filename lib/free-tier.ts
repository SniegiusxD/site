import type { LiveBoard, LiveSignal, LockedSignal } from '@/lib/live-signals'

/**
 * The free board. An account without a subscription still gets real signals,
 * but only the small ones: value up to 2 % and short odds. Everything above
 * either line arrives locked — sport, kickoff and value only, never the match,
 * the market or the book, so a locked row cannot be reconstructed into a bet.
 */
export const FREE_MAX_EDGE = 0.02
export const FREE_MAX_ODDS = 2.5

export function isFreeSignal(signal: { bestEdge: number; bestOdds: number }): boolean {
  return signal.bestEdge <= FREE_MAX_EDGE && signal.bestOdds <= FREE_MAX_ODDS
}

export function lockedFrom(signal: LiveSignal): LockedSignal {
  return {
    id: signal.id,
    sport: signal.sport,
    startsAt: signal.startsAt,
    bestEdge: signal.bestEdge,
    bestOdds: signal.bestOdds,
  }
}

/** Splits a full board into what a free account may see. */
export function freeBoard(board: LiveBoard): LiveBoard {
  const signals: LiveSignal[] = []
  const locked: LockedSignal[] = []
  for (const signal of board.signals) {
    if (isFreeSignal(signal)) signals.push(signal)
    // Only what a subscription would actually open: a closed or started signal
    // cannot be bet any more, so it is neither listed nor counted.
    else if (signal.status === 'open') locked.push(lockedFrom(signal))
  }
  // Locked rows lead with the biggest value: that is the part worth paying for.
  locked.sort((a, b) => b.bestEdge - a.bestEdge)
  return { signals, locked, status: board.status, tier: 'free' }
}
