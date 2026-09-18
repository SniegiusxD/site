import record from '@/lib/data/track-record.json'
import { DAILY_BET_CHOICES } from '@/lib/preferences'

/**
 * Our own settled signals, exported from the aggregator ledger (trusted rows
 * only, site books only). `returns` holds each bet's profit per 1 € staked.
 * Re-export with the script noted in the site plan when the ledger grows.
 */
export type TrackRecord = {
  source: string
  generatedAt: string
  ledgerSnapshot: string
  bets: number
  roi: number
  averageOdds: number
  medianFullKelly: number
  firstDate: string
  lastDate: string
  byBook: Record<string, number>
  won: number
  lost: number
  pushed: number
  returns: number[]
}

export const TRACK_RECORD = record as TrackRecord

/** About three minutes a bet: find it at the book, place it, mark it here. */
export const MINUTES_PER_BET = 3

export const PACE_CHOICES = DAILY_BET_CHOICES.map((bets) => ({ bets, minutes: bets * MINUTES_PER_BET }))

export function timeLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours} val.` : `${hours.toFixed(1).replace('.', ',')} val.`
}

export const daysTo = (bets: number, perDay: number) => Math.ceil(bets / Math.max(1, perDay))

/**
 * One flat stake for the scenarios: the member's Kelly share of a typical
 * signal (our median full Kelly), capped at 5 % like the board, at least 1 €.
 */
export function simulationStake(bankroll: number, kellyFraction: number): number {
  return Math.max(1, Math.floor(bankroll * Math.min(0.05, TRACK_RECORD.medianFullKelly * kellyFraction)))
}

const MONTHS_GENITIVE = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio']

/** "rugsėjo 6–14 d." or "rugpjūčio 28 – rugsėjo 14 d." */
export function recordPeriodLabel(first = TRACK_RECORD.firstDate, last = TRACK_RECORD.lastDate): string {
  const [, m1, d1] = first.split('-').map(Number)
  const [, m2, d2] = last.split('-').map(Number)
  return m1 === m2
    ? `${MONTHS_GENITIVE[m1 - 1]} ${d1}–${d2} d.`
    : `${MONTHS_GENITIVE[m1 - 1]} ${d1} d. – ${MONTHS_GENITIVE[m2 - 1]} ${d2} d.`
}
