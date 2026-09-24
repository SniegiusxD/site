import type { BookName } from '@/lib/landing-signals'
import { MARKET_FAMILIES, PART_MARKETS } from '@/lib/signal-taxonomy'
import type { LivePrice, LiveSignal } from '@/lib/live-signals'
import type { Settings } from '@/lib/preferences'

export type BoardFilters = Pick<Settings, 'books' | 'minEdge' | 'minOdds' | 'maxOdds' | 'maxHoursToStart'> & {
  /** One sport, or null for all. Kept for the old sport row. */
  sport: string | null
  /** Sport keys; empty means every sport. */
  sports?: string[]
  /** Market family keys (lib/signal-taxonomy.ts); empty means every market. */
  markets?: string[]
  /** 'full' and/or 'part'; empty means both. */
  periods?: string[]
}

export type BoardRow = { signal: LiveSignal; price: LivePrice }

/** The best price the user can actually take: a published book they use, inside their limits. */
export function playablePrice(signal: LiveSignal, filters: Omit<BoardFilters, 'maxHoursToStart' | 'sport'>): LivePrice | null {
  let best: LivePrice | null = null
  for (const price of signal.prices) {
    if (!price.published || !filters.books.includes(price.book)) continue
    if (price.edge < filters.minEdge - 1e-9) continue
    if (price.odds < filters.minOdds - 1e-9 || price.odds > filters.maxOdds + 1e-9) continue
    if (!best || price.edge > best.edge) best = price
  }
  return best
}

/**
 * Open rows the user can bet now (inside the time window, not started), best
 * value first; closed rows (recently closed or started) newest first.
 */
export function boardRows(signals: LiveSignal[], filters: BoardFilters, now: Date) {
  const open: BoardRow[] = []
  const closed: BoardRow[] = []
  const nowMs = now.getTime()
  const horizon = nowMs + filters.maxHoursToStart * 3_600_000

  const allowedMarkets = filters.markets?.length
    ? new Set<string>(MARKET_FAMILIES.filter((family) => filters.markets!.includes(family.key)).flatMap((family) => [...family.markets]))
    : null

  for (const signal of signals) {
    if (filters.sport && signal.sport !== filters.sport) continue
    if (filters.sports?.length && !filters.sports.includes(signal.sport)) continue
    if (allowedMarkets && !allowedMarkets.has(signal.market)) continue
    if (filters.periods?.length) {
      const isPart = (PART_MARKETS as readonly string[]).includes(signal.market)
      if (isPart && !filters.periods.includes('part')) continue
      if (!isPart && !filters.periods.includes('full')) continue
    }
    const start = new Date(signal.startsAt).getTime()
    if (signal.status === 'open' && start > nowMs) {
      if (start > horizon) continue
      const price = playablePrice(signal, filters)
      if (price) open.push({ signal, price })
    } else {
      // A closed signal is still shown if it was for the user's books at all.
      const price = playablePrice(signal, { books: filters.books, minEdge: -1, minOdds: 1, maxOdds: Infinity })
      if (price) closed.push({ signal, price })
    }
  }

  open.sort((a, b) => b.price.edge - a.price.edge)
  closed.sort(
    (a, b) => new Date(b.signal.closedAt ?? b.signal.startsAt).getTime() - new Date(a.signal.closedAt ?? a.signal.startsAt).getTime(),
  )
  return { open, closed }
}

/**
 * The row a link like /signalai?signal=<id>&book=<book> points at: that book's
 * row when it is on the board, otherwise the signal's row for another book.
 */
export function linkedRow(rows: { open: BoardRow[]; closed: BoardRow[] }, id: string | undefined, book?: string): BoardRow | null {
  if (!id) return null
  const all = [...rows.open, ...rows.closed]
  return all.find((row) => row.signal.id === id && (!book || row.price.book === book)) ?? all.find((row) => row.signal.id === id) ?? null
}

export function sportsIn(signals: LiveSignal[]): string[] {
  return [...new Set(signals.filter((s) => s.status === 'open').map((s) => s.sport))].sort()
}

export function booksWithPrice(signal: LiveSignal): Set<BookName> {
  return new Set(signal.prices.map((price) => price.book))
}

export function timeUntilLabel(startsAt: string, now: Date): string {
  const minutes = Math.round((new Date(startsAt).getTime() - now.getTime()) / 60_000)
  if (minutes <= 0) return 'prasidėjo'
  if (minutes < 60) return `po ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 24) return rest ? `po ${hours} val. ${rest} min` : `po ${hours} val.`
  const days = Math.floor(hours / 24)
  return `po ${days} d. ${hours % 24} val.`
}

/**
 * Time to kickoff for the compact board, where the column is narrow: minutes
 * under an hour, minutes kept only while they still matter (under 3 hours),
 * days past a day.
 */
export function compactUntilLabel(startsAt: string, now: Date): string {
  const minutes = Math.round((new Date(startsAt).getTime() - now.getTime()) / 60_000)
  if (minutes <= 0) return 'prasidėjo'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours < 3) return rest ? `${hours} val. ${rest} min` : `${hours} val.`
  if (hours < 24) return `${hours} val.`
  const days = Math.floor(hours / 24)
  return hours % 24 ? `${days} d. ${hours % 24} val.` : `${days} d.`
}

export function agoLabel(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'ką tik'
  if (minutes < 60) return `prieš ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return hours < 24 ? `prieš ${hours} val.` : `prieš ${Math.floor(hours / 24)} d.`
}

const MONTHS = ['saus.', 'vas.', 'kov.', 'bal.', 'geg.', 'birž.', 'liep.', 'rugp.', 'rugs.', 'spal.', 'lapkr.', 'gruod.']

const vilniusParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Vilnius',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "rugs. 14 d. 18:45" in Vilnius time. */
export function kickoffLabel(iso: string): string {
  const parts = vilniusParts.formatToParts(new Date(iso))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${MONTHS[Number(get('month')) - 1]} ${Number(get('day'))} d. ${get('hour')}:${get('minute')}`
}

/** "HH:MM" in Vilnius time. */
export function clockLabel(iso: string): string {
  const parts = vilniusParts.formatToParts(new Date(iso))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('hour')}:${get('minute')}`
}

/** Book descriptions use "171.5" and "-16.5"; show "171,5" and "−16,5". */
export function ltNumbers(text: string): string {
  return text.replace(/(\d)\.(\d)/g, '$1,$2').replace(/(^|[\s(])-(\d)/g, '$1−$2')
}

// The runner appends " (interp.)" when Pinnacle has no price on this exact line
// and the fair price was interpolated from its neighbouring lines.
const INTERPOLATED = /\s*\(interp\.\)\s*$/i

export function isInterpolatedLabel(text: string): boolean {
  return INTERPOLATED.test(text)
}

/**
 * A bet label for display: the interpolation tag is dropped (the detail view
 * explains it in words), a few English market words the runner still emits
 * become Lithuanian, then numbers get Lithuanian decimals. Grading keeps the
 * raw label.
 */
export function ltSelection(text: string): string {
  return ltNumbers(
    text
      .replace(INTERPOLATED, '')
      .replace(/\s+regulation moneyline\b/i, ' laimės per pagrindinį laiką')
      .replace(/\s+moneyline\b/i, ' laimės'),
  )
}

/** "A – B" with the dash tied to the first team, so a wrapped title never starts with a dash. */
export function eventLabel(name: string): string {
  return name.replace(/ – /g, `${String.fromCharCode(160)}– `)
}

/** A scan older than this is shown as stale. Measured cycle gap: ~41 min (median, 2026-09-18). */
export const STALE_AFTER_MINUTES = 75

export function isStale(cycleAt: string | undefined, now: Date): boolean {
  if (!cycleAt) return true
  return now.getTime() - new Date(cycleAt).getTime() > STALE_AFTER_MINUTES * 60_000
}
