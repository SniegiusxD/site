import type { Period } from '@/lib/bet-value'

/**
 * "Topas": members ranked by their own settled bets. Only members who switch it
 * on with a nickname are shown to others, and emails never are. A member who
 * has not joined still sees their own numbers and the place they would take.
 */

export type TopSort = 'profit' | 'roi' | 'clv'
export const TOP_SORTS: readonly TopSort[] = ['profit', 'roi', 'clv']
export const TOP_PERIODS: readonly Period[] = ['week', 'month', 'all']

/** ROI and CLV over a handful of bets say almost nothing, so those rankings need a sample. */
export const MIN_BETS_FOR_RATE = 10

export type TopProfile = { optIn: boolean; name: string | null }

/** One member's settled bets in the period, as the database sums them. */
export type TopRow = {
  userId: string
  name: string | null
  optedIn: boolean
  bets: number
  won: number
  lost: number
  pushed: number
  profit: number
  staked: number
  /** Average closing line value over bets with a closing price. */
  clv: number | null
  clvBets: number
}

export type TopEntry = {
  userId: string
  /** Null outside the ranking: too few bets for this sort, or not joined. */
  rank: number | null
  name: string
  isYou: boolean
  bets: number
  won: number
  lost: number
  pushed: number
  profit: number
  roi: number | null
  clv: number | null
  clvBets: number
  /** Running profit through the period, for the leaders only. */
  series?: number[]
}

export type TopBoard = {
  ranked: TopEntry[]
  /** Joined, but too few bets for a ROI or CLV ranking. */
  tooFew: TopEntry[]
  /** The viewer's own line when they have not joined; only they see it. */
  you: (TopEntry & { wouldBe: number | null }) | null
}

const round2 = (value: number) => Math.round(value * 100) / 100

function toEntry(row: TopRow, viewerId: string): TopEntry {
  return {
    userId: row.userId,
    rank: null,
    name: row.name ?? 'Tu',
    isYou: row.userId === viewerId,
    bets: row.bets,
    won: row.won,
    lost: row.lost,
    pushed: row.pushed,
    profit: round2(row.profit),
    roi: row.staked > 0 ? row.profit / row.staked : null,
    clv: row.clv,
    clvBets: row.clvBets,
  }
}

export function metricOf(entry: Pick<TopEntry, 'profit' | 'roi' | 'clv'>, sort: TopSort): number | null {
  return sort === 'profit' ? entry.profit : sort === 'roi' ? entry.roi : entry.clv
}

export function hasSample(entry: Pick<TopEntry, 'bets' | 'clv' | 'clvBets'>, sort: TopSort): boolean {
  if (sort === 'profit') return entry.bets > 0
  if (sort === 'roi') return entry.bets >= MIN_BETS_FOR_RATE
  return entry.clv !== null && entry.clvBets >= MIN_BETS_FOR_RATE
}

/** Negative when `a` ranks ahead of `b`: better number, then more bets, then name. */
function compare(a: TopEntry, b: TopEntry, sort: TopSort): number {
  const left = metricOf(a, sort) ?? Number.NEGATIVE_INFINITY
  const right = metricOf(b, sort) ?? Number.NEGATIVE_INFINITY
  if (left !== right) return left > right ? -1 : 1
  if (a.bets !== b.bets) return b.bets - a.bets
  return a.name.localeCompare(b.name, 'lt')
}

export function rankMembers(rows: TopRow[], viewerId: string, sort: TopSort): TopBoard {
  const joined = rows.filter((row) => row.optedIn && row.name).map((row) => toEntry(row, viewerId))
  const ranked = joined
    .filter((entry) => hasSample(entry, sort))
    .sort((a, b) => compare(a, b, sort))
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
  const tooFew = joined
    .filter((entry) => !hasSample(entry, sort))
    .sort((a, b) => b.bets - a.bets || a.name.localeCompare(b.name, 'lt'))

  const own = rows.find((row) => row.userId === viewerId && !(row.optedIn && row.name))
  if (!own) return { ranked, tooFew, you: null }
  const entry = toEntry(own, viewerId)
  // A tie goes the viewer's way: only a better number, or the same number over more bets, is ahead.
  const mine = metricOf(entry, sort) ?? Number.NEGATIVE_INFINITY
  const ahead = (other: TopEntry) => {
    const theirs = metricOf(other, sort) ?? Number.NEGATIVE_INFINITY
    return theirs > mine || (theirs === mine && other.bets > entry.bets)
  }
  const wouldBe = hasSample(entry, sort) ? ranked.filter(ahead).length + 1 : null
  return { ranked, tooFew, you: { ...entry, wouldBe } }
}

/** Running total of profits, at most `points` values, starting at 0 and ending on the total. */
export function runningSeries(profits: number[], points = 32): number[] {
  const totals = [0]
  for (const profit of profits) totals.push(round2(totals[totals.length - 1] + profit))
  if (totals.length <= points) return totals
  const step = (totals.length - 1) / (points - 1)
  return Array.from({ length: points }, (_, index) => totals[Math.round(index * step)])
}

const NAME = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,19}$/u

export function parseTopProfile(input: unknown): { ok: true; value: TopProfile } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Trūksta duomenų.' }
  const raw = input as Record<string, unknown>
  if (typeof raw.optIn !== 'boolean') return { ok: false, error: 'Pasirink, ar rodyti tave tope.' }
  const name = typeof raw.name === 'string' ? raw.name.normalize('NFC').replace(/\s+/g, ' ').trim() : ''
  if (!name) {
    if (raw.optIn) return { ok: false, error: 'Įrašyk vardą, kurį matys kiti nariai.' }
    return { ok: true, value: { optIn: false, name: null } }
  }
  if (!NAME.test(name) || !/\p{L}/u.test(name)) {
    return { ok: false, error: 'Vardas: 2–20 ženklų su bent viena raide. Galima naudoti skaičius, tarpus ir . _ -' }
  }
  return { ok: true, value: { optIn: raw.optIn, name } }
}

export const parseSort = (value: unknown): TopSort => (TOP_SORTS.includes(value as TopSort) ? (value as TopSort) : 'profit')

export const parsePeriod = (value: unknown): Period => (TOP_PERIODS.includes(value as Period) ? (value as Period) : 'month')

const monthParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit' })

/** "2026-09": the calendar month in Vilnius. */
export function vilniusMonth(date: Date): string {
  const parts = monthParts.formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}`
}

/** A valid past or current month; anything else means this month. */
export function parseMonth(value: unknown, now: Date): string {
  const current = vilniusMonth(now)
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return current
  return value > current ? current : value
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const index = year * 12 + (monthNumber - 1) + delta
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}
