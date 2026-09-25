import { OUTCOME_LABEL, isCanonicalOutcome, type CanonicalOutcome } from '@/lib/member-outcomes'

/**
 * The public track record: every published signal whose match has started,
 * set against Pinnacle's closing price and, once graded, its result. Nothing is
 * picked or hidden; a signal without a captured close is still listed.
 */

export type PastSignal = {
  id: string
  sport: string
  startsAt: string
  market: string
  direction: string | null
  line: number | null
  home: string | null
  away: string | null
  book: string
  /** The last price we saw before the signal closed. */
  odds: number
  /** Value when published: odds × fair probability − 1. */
  edge: number
  /** Pinnacle's de-vigged probability at the close; null when none was captured. */
  closingFairProb: number | null
  outcome: CanonicalOutcome | null
}

/** odds × closing fair probability − 1, or null without a close. */
export function clvOf(signal: Pick<PastSignal, 'odds' | 'closingFairProb'>): number | null {
  if (signal.closingFairProb === null || !(signal.closingFairProb > 0) || !(signal.odds > 1)) return null
  return signal.odds * signal.closingFairProb - 1
}

/** Profit of a one-unit stake at the signal's odds. */
export function unitProfit(outcome: CanonicalOutcome, odds: number): number {
  switch (outcome) {
    case 'won':
      return odds - 1
    case 'half_won':
      return (odds - 1) / 2
    case 'push':
    case 'void':
      return 0
    case 'half_lost':
      return -0.5
    case 'lost':
      return -1
  }
}

export type ResultSummary = {
  signals: number
  withClose: number
  /** Share of signals with a close whose price beat it. */
  beatClose: number | null
  meanClv: number | null
  graded: number
  won: number
  lost: number
  /** Pushes, voids and halves count toward graded but not won/lost. */
  other: number
  /** Profit per unit staked across graded signals, flat stakes. */
  roi: number | null
  /** Normal-approximation 95 % range of roi; null below 30 graded. */
  roiLow: number | null
  roiHigh: number | null
}

export function summarize(signals: PastSignal[]): ResultSummary {
  const clvs = signals.map(clvOf).filter((value): value is number => value !== null)
  const graded = signals.filter((signal): signal is PastSignal & { outcome: CanonicalOutcome } => signal.outcome !== null)
  const won = graded.filter((signal) => signal.outcome === 'won' || signal.outcome === 'half_won').length
  const lost = graded.filter((signal) => signal.outcome === 'lost' || signal.outcome === 'half_lost').length
  const profits = graded.map((signal) => unitProfit(signal.outcome, signal.odds))
  const profit = profits.reduce((sum, value) => sum + value, 0)
  // Per-signal, not per-fixture, so the range is if anything too narrow; it is
  // shown to stop a short lucky run from reading as a rate.
  const mean = graded.length ? profit / graded.length : 0
  const spread =
    graded.length >= 30
      ? 1.96 * Math.sqrt(profits.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (graded.length - 1) / graded.length)
      : null
  return {
    signals: signals.length,
    withClose: clvs.length,
    beatClose: clvs.length ? clvs.filter((value) => value > 0).length / clvs.length : null,
    meanClv: clvs.length ? clvs.reduce((sum, value) => sum + value, 0) / clvs.length : null,
    graded: graded.length,
    won,
    lost,
    other: graded.length - won - lost,
    roi: graded.length ? mean : null,
    roiLow: spread === null ? null : mean - spread,
    roiHigh: spread === null ? null : mean + spread,
  }
}

export function summarizeByBook(signals: PastSignal[], books: readonly string[]) {
  return books
    .map((book) => ({ book, ...summarize(signals.filter((signal) => signal.book === book)) }))
    .filter((row) => row.signals > 0)
}

const PERIOD_SUFFIX: Array<[RegExp, string]> = [
  [/_1h$/, '1 kėlinys'],
  [/_sets$/, 'setai'],
]

function periodOf(market: string): string | null {
  return PERIOD_SUFFIX.find(([pattern]) => pattern.test(market))?.[1] ?? null
}

const signed = (line: number) => (line > 0 ? `+${line}` : `${line}`).replace('.', ',')
const plain = (line: number) => `${line}`.replace('.', ',')

/**
 * What was backed, in Lithuanian, from the stored market fields alone. The
 * bookmaker's own wording is gone once a signal closes, so this is rebuilt.
 */
export function selectionText(signal: Pick<PastSignal, 'market' | 'direction' | 'line' | 'home' | 'away'>): string {
  const { market, direction, line } = signal
  const home = signal.home || 'Namų komanda'
  const away = signal.away || 'Svečių komanda'
  const period = periodOf(market)
  const suffix = period ? ` (${period})` : ''
  const side = direction?.startsWith('home') ? home : direction?.startsWith('away') ? away : null
  const overUnder = direction?.endsWith('over') ? 'Daugiau' : direction?.endsWith('under') ? 'Mažiau' : null

  if (market.startsWith('corner')) {
    const who = side ? `${side} kampiniai` : 'Kampiniai'
    return overUnder && line !== null ? `${who}: ${overUnder.toLowerCase()} nei ${plain(line)}${suffix}` : `${who}${suffix}`
  }
  if (market.startsWith('booking')) {
    return overUnder && line !== null ? `Kortelės: ${overUnder.toLowerCase()} nei ${plain(line)}${suffix}` : `Kortelės${suffix}`
  }
  if (market.startsWith('team_total')) {
    return overUnder && line !== null && side ? `${side}: ${overUnder.toLowerCase()} nei ${plain(line)}${suffix}` : `Komandos suminis${suffix}`
  }
  if (market.includes('total')) {
    return overUnder && line !== null ? `${overUnder} nei ${plain(line)}${suffix}` : `Suminis${suffix}`
  }
  if (market.includes('spread') || market.includes('handicap')) {
    return side && line !== null ? `${side} ${signed(line)}${suffix}` : `Pranašumas${suffix}`
  }
  if (market.startsWith('btts')) {
    return `Abi komandos įmuš: ${direction === 'no' ? 'ne' : 'taip'}${suffix}`
  }
  if (market.startsWith('moneyline')) {
    if (direction === 'draw') return `Lygiosios${suffix}`
    const regulation = market === 'moneyline_reg' ? ' (reguliarus laikas)' : ''
    return side ? `${side} laimės${regulation}${suffix}` : `Nugalėtojas${suffix}`
  }
  return market.replace(/_/g, ' ')
}

export const outcomeText = (outcome: CanonicalOutcome | null) => (outcome ? OUTCOME_LABEL[outcome] : null)

/** Defensive row parsing: the VM owns these tables and adds columns over time. */
export function parsePastSignal(row: Record<string, unknown>): PastSignal | null {
  const odds = Number(row.best_odds)
  const edge = Number(row.best_edge)
  const startsAt = row.starts_at instanceof Date ? row.starts_at.toISOString() : typeof row.starts_at === 'string' ? row.starts_at : null
  if (typeof row.id !== 'string' || typeof row.market !== 'string' || !startsAt || !(odds > 1) || !Number.isFinite(edge)) return null
  const close = row.closing_fair_prob === null || row.closing_fair_prob === undefined ? null : Number(row.closing_fair_prob)
  return {
    id: row.id,
    sport: String(row.sport ?? ''),
    startsAt: new Date(startsAt).toISOString(),
    market: row.market,
    direction: typeof row.direction === 'string' ? row.direction : null,
    line: row.line === null || row.line === undefined ? null : Number(row.line),
    home: typeof row.home === 'string' ? row.home : null,
    away: typeof row.away === 'string' ? row.away : null,
    book: String(row.best_book ?? ''),
    odds,
    edge,
    closingFairProb: close !== null && close > 0 && close < 1 ? close : null,
    outcome: isCanonicalOutcome(row.outcome) ? row.outcome : null,
  }
}

export type ClvDay = {
  /** YYYY-MM-DD in Vilnius. */
  day: string
  withClose: number
  meanClv: number
  beatClose: number
}

/** Mean CLV per Vilnius kickoff day, oldest first; days without a close are left out. */
export function clvByDay(signals: PastSignal[], dayOf: (iso: string) => string): ClvDay[] {
  const days = new Map<string, number[]>()
  for (const signal of signals) {
    const clv = clvOf(signal)
    if (clv === null) continue
    const day = dayOf(signal.startsAt)
    days.set(day, [...(days.get(day) ?? []), clv])
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, values]) => ({
      day,
      withClose: values.length,
      meanClv: values.reduce((sum, value) => sum + value, 0) / values.length,
      beatClose: values.filter((value) => value > 0).length / values.length,
    }))
}
