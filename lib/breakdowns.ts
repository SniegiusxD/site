import { closingValue } from '@/lib/bet-value'
import { MARKET_FAMILIES } from '@/lib/signal-taxonomy'
import { sportName } from '@/lib/sports-lt'
import type { ActiveBet } from '@/lib/types'

/**
 * Where the results actually came from. One line per bookmaker, sport or market
 * family, so a member can see that (say) every loss is in one book rather than
 * reading a single ROI and guessing.
 */
export type BreakdownKind = 'book' | 'sport' | 'market'

export type BreakdownRow = {
  key: string
  label: string
  settled: number
  staked: number
  profit: number
  /** Null until there is something staked. */
  roi: number | null
  /** Mean closing-line value, null until a closing price exists. */
  clv: number | null
}

const familyOf = (market: string) =>
  MARKET_FAMILIES.find((family) => (family.markets as readonly string[]).includes(market))?.label ?? 'Kita'

function keyFor(bet: ActiveBet, kind: BreakdownKind): { key: string; label: string } {
  if (kind === 'book') return { key: bet.bookmaker, label: bet.bookmaker }
  if (kind === 'sport') {
    const sport = bet.sport ?? 'OTHER'
    return { key: sport, label: sportName(sport.toLowerCase()) }
  }
  const market = bet.marketType ?? 'other'
  return { key: market, label: familyOf(market) }
}

/** Settled bets only: a pending bet has no result to attribute. */
export function breakdown(bets: ActiveBet[], kind: BreakdownKind): BreakdownRow[] {
  const rows = new Map<string, BreakdownRow & { clvSum: number; clvCount: number }>()

  for (const bet of bets) {
    if (bet.profit === null) continue
    const { key, label } = keyFor(bet, kind)
    const row =
      rows.get(label) ??
      { key, label, settled: 0, staked: 0, profit: 0, roi: null, clv: null, clvSum: 0, clvCount: 0 }
    row.settled += 1
    row.staked += bet.stake
    row.profit += bet.profit
    const clv = closingValue(bet)
    if (clv !== null) {
      row.clvSum += clv
      row.clvCount += 1
    }
    rows.set(label, row)
  }

  return [...rows.values()]
    .map(({ clvSum, clvCount, ...row }) => ({
      ...row,
      roi: row.staked > 0 ? row.profit / row.staked : null,
      clv: clvCount > 0 ? clvSum / clvCount : null,
    }))
    .sort((a, b) => b.settled - a.settled || b.profit - a.profit)
}
