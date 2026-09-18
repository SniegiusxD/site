import { BOOKS, type BookName } from '@/lib/landing-signals'
import { MARKET_KEYS, PERIOD_KEYS, SPORT_KEYS } from '@/lib/signal-taxonomy'

/**
 * Per-member Telegram alert rules. Hours are Vilnius clock hours (0–23).
 *
 * An empty sports/markets/periods list means "no restriction", which is both
 * the sane default and what the bot already does with an empty array.
 */
export type TelegramSettings = {
  enabled: boolean
  /** Minimum edge as a fraction: 0.02 = 2 %. */
  minEdge: number
  maxHoursToStart: number
  books: BookName[]
  sports: string[]
  markets: string[]
  periods: string[]
  minOdds: number
  maxOdds: number
  /** Quiet hours: no alerts from quietStart up to quietEnd. Both null = off. */
  quietStart: number | null
  quietEnd: number | null
}

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  enabled: true,
  minEdge: 0.02,
  maxHoursToStart: 24,
  books: [...BOOKS],
  sports: [],
  markets: [],
  periods: [],
  minOdds: 1,
  maxOdds: 100,
  quietStart: null,
  quietEnd: null,
}

export const TELEGRAM_EDGE_CHOICES = [0.01, 0.02, 0.03, 0.05] as const
export const TELEGRAM_HOUR_CHOICES = [6, 12, 24, 48] as const

type Result = { ok: true; value: TelegramSettings } | { ok: false; error: string }

const isHour = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 23

const keysFrom = (raw: unknown, allowed: readonly string[]) =>
  Array.isArray(raw) ? allowed.filter((key) => (raw as unknown[]).includes(key)) : []

export function parseTelegramSettings(input: unknown): Result {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Trūksta nustatymų.' }
  const raw = input as Record<string, unknown>

  if (typeof raw.enabled !== 'boolean') return { ok: false, error: 'Netinkama pranešimų būsena.' }

  const minEdge = raw.minEdge
  if (typeof minEdge !== 'number' || !Number.isFinite(minEdge) || minEdge < 0 || minEdge > 0.2) {
    return { ok: false, error: 'Mažiausia vertė turi būti nuo 0 iki 20 %.' }
  }

  const maxHours = raw.maxHoursToStart
  if (!Number.isInteger(maxHours) || (maxHours as number) < 1 || (maxHours as number) > 24 * 14) {
    return { ok: false, error: 'Laikas iki rungtynių turi būti nuo 1 val. iki 14 dienų.' }
  }

  const books = Array.isArray(raw.books) ? BOOKS.filter((book) => (raw.books as unknown[]).includes(book)) : []
  if (books.length === 0) return { ok: false, error: 'Pasirink bent vieną kontorą.' }

  const minOdds = raw.minOdds
  const maxOdds = raw.maxOdds
  if (typeof minOdds !== 'number' || typeof maxOdds !== 'number' || !Number.isFinite(minOdds) || !Number.isFinite(maxOdds)) {
    return { ok: false, error: 'Netinkamos koeficientų ribos.' }
  }
  if (minOdds < 1 || maxOdds > 100 || minOdds >= maxOdds) {
    return { ok: false, error: 'Koeficientų riba turi būti nuo 1,00 iki 100,00, o apatinė mažesnė už viršutinę.' }
  }

  const { quietStart, quietEnd } = raw
  const quietOff = quietStart === null && quietEnd === null
  if (!quietOff && !(isHour(quietStart) && isHour(quietEnd) && quietStart !== quietEnd)) {
    return { ok: false, error: 'Tylos valandų pradžia ir pabaiga turi būti skirtingos valandos.' }
  }

  return {
    ok: true,
    value: {
      enabled: raw.enabled,
      minEdge,
      maxHoursToStart: maxHours as number,
      books,
      sports: keysFrom(raw.sports, SPORT_KEYS),
      markets: keysFrom(raw.markets, MARKET_KEYS),
      periods: keysFrom(raw.periods, PERIOD_KEYS),
      minOdds,
      maxOdds,
      quietStart: quietOff ? null : (quietStart as number),
      quietEnd: quietOff ? null : (quietEnd as number),
    },
  }
}
