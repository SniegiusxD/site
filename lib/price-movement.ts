import type { BookName } from '@/lib/landing-signals'

/**
 * Price movement, without any database import: the board is a client component
 * and must not pull `pg` into the browser bundle. The reader and recorder live
 * in lib/price-history.ts.
 */
export type Movement = {
  /** The first price we recorded for this signal and book. */
  first: number
  last: number
  /** How many cycles we have seen it in. */
  seen: number
  firstAt: string
  lastAt: string
}

/** Per signal, per book. */
export type MovementMap = Record<string, Partial<Record<BookName, Movement>>>

/** Where a price is now against where it started, as a fraction. */
export function driftOf(movement: Movement): number {
  return movement.last / movement.first - 1
}

/** Below this, a move is noise rather than a market signal. */
export const DRIFT_FLOOR = 0.005

/** What changed between two polls: a signal that is new, or one book's price that moved. */
export type Pulse = 'new' | 'up' | 'down'

type PolledSignal = { id: string; prices: ReadonlyArray<{ book: string; odds: number }> }

/**
 * Keyed by signal id for a new signal, and by `id:book` for a moved price. A
 * change under half a cent is rounding between scans, not a move.
 */
export function pollPulses(before: ReadonlyArray<PolledSignal>, after: ReadonlyArray<PolledSignal>): Map<string, Pulse> {
  const oldOdds = new Map(before.flatMap((signal) => signal.prices.map((price) => [`${signal.id}:${price.book}`, price.odds] as const)))
  const oldIds = new Set(before.map((signal) => signal.id))
  const pulses = new Map<string, Pulse>()
  for (const signal of after) {
    if (!oldIds.has(signal.id)) {
      pulses.set(signal.id, 'new')
      continue
    }
    for (const price of signal.prices) {
      const old = oldOdds.get(`${signal.id}:${price.book}`)
      if (old !== undefined && Math.abs(old - price.odds) >= 0.005) pulses.set(`${signal.id}:${price.book}`, price.odds > old ? 'up' : 'down')
    }
  }
  return pulses
}
