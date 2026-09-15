import type { ActiveBet } from '@/lib/types'

/** What settled while the member was away, for the card on Statymai. */
export type SettledSummary = { count: number; won: number; lost: number; pushed: number; profit: number }

type SettledBet = Pick<ActiveBet, 'status' | 'profit' | 'settledAtIso'>

const SETTLED = new Set(['laimeta', 'pralaimeta', 'grazinta'])

const isSettled = (bet: SettledBet) => SETTLED.has(bet.status) && bet.profit !== null && Boolean(bet.settledAtIso)

/**
 * The newest settlement time among these bets, or '' when there is none. Stored
 * as the "seen" marker: server times only, so the device clock never matters.
 */
export function latestSettlement(bets: SettledBet[]): string {
  return bets.reduce((latest, bet) => (isSettled(bet) && bet.settledAtIso! > latest ? bet.settledAtIso! : latest), '')
}

/** Bets settled after the last visit's marker; null on a first visit or when nothing is new. */
export function settledSince(bets: SettledBet[], marker: string | null): SettledSummary | null {
  if (marker === null) return null
  const fresh = bets.filter((bet) => isSettled(bet) && bet.settledAtIso! > marker)
  if (!fresh.length) return null
  return {
    count: fresh.length,
    won: fresh.filter((bet) => bet.status === 'laimeta').length,
    lost: fresh.filter((bet) => bet.status === 'pralaimeta').length,
    pushed: fresh.filter((bet) => bet.status === 'grazinta').length,
    profit: Math.round(fresh.reduce((sum, bet) => sum + (bet.profit ?? 0), 0) * 100) / 100,
  }
}
