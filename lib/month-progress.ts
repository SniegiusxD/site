/**
 * The daily target, seen over the month: how many bets so far against the
 * month's goal, where the member should be by today, and each day's count.
 * All days are Vilnius calendar days, like the daily target itself.
 */

const MONTHS = ['Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis', 'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis']

const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vilnius', year: 'numeric', month: '2-digit', day: '2-digit' })

function vilnius(date: Date) {
  const [year, month, day] = parts.format(date).split('-').map(Number)
  return { year, month, day }
}

export type MonthProgress = {
  label: string
  daysInMonth: number
  today: number
  /** Bets per day of the month, index 0 = the 1st. Future days are 0. */
  perDay: number[]
  total: number
  monthTarget: number
  /** Where the target says the member should be by the end of today. */
  expectedByToday: number
  /** total against expectedByToday: -0.03 is 3 % behind. */
  pace: number
  daysReached: number
  averagePerDay: number
  /** The month's total at the average so far. */
  projected: number
}

export function monthProgress(bets: Array<{ placedAt: string }>, now: Date, dailyTarget: number): MonthProgress {
  const current = vilnius(now)
  const daysInMonth = new Date(Date.UTC(current.year, current.month, 0)).getUTCDate()
  const perDay = Array.from({ length: daysInMonth }, () => 0)
  for (const bet of bets) {
    const when = vilnius(new Date(bet.placedAt))
    if (when.year === current.year && when.month === current.month) perDay[when.day - 1] += 1
  }
  const total = perDay.reduce((sum, count) => sum + count, 0)
  const expectedByToday = dailyTarget * current.day
  const averagePerDay = total / current.day
  return {
    label: MONTHS[current.month - 1],
    daysInMonth,
    today: current.day,
    perDay,
    total,
    monthTarget: dailyTarget * daysInMonth,
    expectedByToday,
    pace: expectedByToday ? total / expectedByToday - 1 : 0,
    daysReached: perDay.slice(0, current.day).filter((count) => dailyTarget > 0 && count >= dailyTarget).length,
    averagePerDay,
    projected: Math.round(averagePerDay * daysInMonth),
  }
}
