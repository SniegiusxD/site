/**
 * A break a member sets for themselves: while it runs, the board and Telegram
 * show no signals. It can be made longer but never shorter; that is what makes
 * it a break rather than a setting. Stored as user_settings."pausedUntil".
 */

export const PAUSE_OPTIONS = [
  { days: 1, label: '24 valandos' },
  { days: 7, label: '7 dienos' },
  { days: 30, label: '30 dienų' },
] as const

export type PauseDays = (typeof PAUSE_OPTIONS)[number]['days']

const DAY_MS = 24 * 60 * 60 * 1000

export function parsePauseDays(value: unknown): PauseDays | null {
  return PAUSE_OPTIONS.find((option) => option.days === value)?.days ?? null
}

/** The end of a new break: never earlier than a break already running. */
export function nextPauseEnd(current: Date | null, days: PauseDays, now: Date): Date {
  const requested = new Date(now.getTime() + days * DAY_MS)
  return current && current > requested ? current : requested
}

/** A break is running only while its end is in the future. */
export function activePause(until: Date | string | null | undefined, now = new Date()): Date | null {
  if (!until) return null
  const end = new Date(until)
  return Number.isFinite(end.getTime()) && end > now ? end : null
}
