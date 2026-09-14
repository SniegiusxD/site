import type { ActiveBet } from '@/lib/types'

export type CalendarDay = {
  /** YYYY-MM-DD in Vilnius time */
  date: string
  profit: number
  staked: number
  settled: number
  pending: number
}

const vilniusDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Vilnius',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function vilniusDay(iso: string | Date): string {
  return vilniusDate.format(new Date(iso))
}

/**
 * Daily totals by kickoff day (Vilnius). A bet without a kickoff time counts on
 * no day, because its "placed" label is relative text, not a date.
 */
export function betsByDay(bets: ActiveBet[]): Map<string, CalendarDay> {
  const days = new Map<string, CalendarDay>()
  for (const bet of bets) {
    if (!bet.startsAt) continue
    const date = vilniusDay(bet.startsAt)
    const day = days.get(date) ?? { date, profit: 0, staked: 0, settled: 0, pending: 0 }
    if (bet.status === 'laukia') {
      day.pending += 1
    } else if (bet.profit !== null && bet.status !== 'neisspresta') {
      day.settled += 1
      day.staked += bet.stake
      day.profit += bet.profit
    }
    days.set(date, day)
  }
  for (const day of days.values()) {
    day.profit = Math.round(day.profit * 100) / 100
    day.staked = Math.round(day.staked * 100) / 100
  }
  return days
}

/** Weeks (Monday first) covering the month, as YYYY-MM-DD or null for padding. */
export function monthGrid(year: number, monthIndex: number): Array<Array<string | null>> {
  const first = new Date(Date.UTC(year, monthIndex, 1))
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const offset = (first.getUTCDay() + 6) % 7
  const cells: Array<string | null> = Array.from({ length: offset }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  while (cells.length % 7) cells.push(null)
  const weeks: Array<Array<string | null>> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}
