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
