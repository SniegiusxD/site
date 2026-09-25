import type { ActiveBet } from '@/lib/types'

/** What settled while the member was away, for the card on Statymai. */
export type SettledSummary = {
  count: number
  won: number
  lost: number
  pushed: number
  profit: number
  /** Of these, how many have a closing price, and how many beat it. */
  withClose: number
  beatClose: number
}

type SettledBet = Pick<ActiveBet, 'status' | 'profit' | 'settledAtIso'> & Partial<Pick<ActiveBet, 'odds' | 'closingFairProb'>>

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
  const closes = fresh
    .filter((bet) => bet.odds && bet.closingFairProb)
    .map((bet) => bet.odds! * bet.closingFairProb! - 1)
  return {
    count: fresh.length,
    won: fresh.filter((bet) => bet.status === 'laimeta').length,
    lost: fresh.filter((bet) => bet.status === 'pralaimeta').length,
    pushed: fresh.filter((bet) => bet.status === 'grazinta').length,
    profit: Math.round(fresh.reduce((sum, bet) => sum + (bet.profit ?? 0), 0) * 100) / 100,
    withClose: closes.length,
    beatClose: closes.filter((clv) => clv > 0).length,
  }
}
