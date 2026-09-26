import { BOOKS, type BookName } from '@/lib/landing-signals'

export type Preferences = {
  bankroll: number
  books: BookName[]
  /** Minimum edge as a fraction: 0.02 = 2 %. */
  minEdge: number
  minOdds: number
  maxOdds: number
  maxHoursToStart: number
  /** Share of full Kelly: 0.25 = quarter Kelly. */
  kellyFraction: number
  /** Per-book maximum stake in euros; missing = no limit. */
  bookLimits: Partial<Record<BookName, number>>
  /** The daily target: how many signals the member plans to bet per day. */
  dailyBets: number
  /**
   * A flat amount in euros for every signal instead of Kelly sizing; null =
   * size by value (Kelly). The 5 % ceiling and book limits still apply.
   */
  fixedStake: number | null
}

export const DEFAULT_PREFERENCES: Preferences = {
  bankroll: 500,
  books: [...BOOKS],
  minEdge: 0.02,
  minOdds: 1.3,
  maxOdds: 6,
  maxHoursToStart: 48,
  kellyFraction: 0.25,
  bookLimits: {},
  dailyBets: 10,
  fixedStake: null,
}

export const KELLY_CHOICES = [0.125, 0.25, 0.5] as const

export const DAILY_BET_CHOICES = [5, 10, 20, 40] as const

export type Settings = Omit<Preferences, 'bankroll'>

type Result = { ok: true; value: Preferences } | { ok: false; error: string }
type SettingsResult = { ok: true; value: Settings } | { ok: false; error: string }

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Validates onboarding input: settings plus the starting bankroll. */
export function parsePreferences(input: unknown): Result {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Trūksta nustatymų.' }
  const bankroll = (input as Record<string, unknown>).bankroll
  if (!isNumber(bankroll) || bankroll < 10 || bankroll > 1_000_000) {
    return { ok: false, error: 'Bankrollas turi būti nuo 10 iki 1 000 000 €.' }
  }
  const settings = parseSettings(input)
  if (!settings.ok) return settings
  return { ok: true, value: { bankroll: Math.round(bankroll * 100) / 100, ...settings.value } }
}

/**
 * Validates signal settings without the bankroll (which changes only through
 * the ledger). Error messages are shown to the user.
 */
export function parseSettings(input: unknown): SettingsResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Trūksta nustatymų.' }
  const raw = input as Record<string, unknown>

  const books = Array.isArray(raw.books) ? raw.books.filter((b): b is BookName => BOOKS.includes(b as BookName)) : []
  const uniqueBooks = [...new Set(books)]
  if (uniqueBooks.length === 0) return { ok: false, error: 'Pasirink bent vieną kontorą.' }

  const minEdge = raw.minEdge
  if (!isNumber(minEdge) || minEdge < 0 || minEdge > 0.2) {
    return { ok: false, error: 'Mažiausia vertė turi būti nuo 0 iki 20 %.' }
  }

  const minOdds = raw.minOdds
  const maxOdds = raw.maxOdds
  if (!isNumber(minOdds) || !isNumber(maxOdds) || minOdds < 1.01 || maxOdds > 50 || minOdds >= maxOdds) {
    return { ok: false, error: 'Koeficientų intervalas netinkamas.' }
  }

  const maxHoursToStart = raw.maxHoursToStart
  if (!isNumber(maxHoursToStart) || maxHoursToStart < 1 || maxHoursToStart > 24 * 14) {
    return { ok: false, error: 'Laikas iki rungtynių turi būti nuo 1 val. iki 14 dienų.' }
  }

  const kellyFraction = raw.kellyFraction
  if (!isNumber(kellyFraction) || !KELLY_CHOICES.includes(kellyFraction as (typeof KELLY_CHOICES)[number])) {
    return { ok: false, error: 'Netinkama Kelly dalis.' }
  }

  const bookLimits: Partial<Record<BookName, number>> = {}
  if (raw.bookLimits && typeof raw.bookLimits === 'object') {
    for (const [book, limit] of Object.entries(raw.bookLimits as Record<string, unknown>)) {
      if (!BOOKS.includes(book as BookName) || limit === null || limit === undefined || limit === '') continue
      if (!isNumber(limit) || limit < 1 || limit > 100_000) {
        return { ok: false, error: `${book} limitas turi būti nuo 1 iki 100 000 €.` }
      }
      bookLimits[book as BookName] = Math.round(limit)
    }
  }

  // Older clients and onboarding do not send a target yet: keep the default.
  const dailyBets = raw.dailyBets ?? DEFAULT_PREFERENCES.dailyBets
  if (!isNumber(dailyBets) || dailyBets < 1 || dailyBets > 200) {
    return { ok: false, error: 'Dienos riba turi būti nuo 1 iki 200 statymų.' }
  }

  // Not sent (older clients, onboarding) or null: size by value.
  const fixedStake = raw.fixedStake ?? null
  if (fixedStake !== null && (!isNumber(fixedStake) || fixedStake < 1 || fixedStake > 100_000)) {
    return { ok: false, error: 'Fiksuota suma turi būti nuo 1 iki 100 000 €.' }
  }

  return {
    ok: true,
    value: {
      books: BOOKS.filter((book) => uniqueBooks.includes(book)),
      minEdge,
      minOdds,
      maxOdds,
      maxHoursToStart: Math.round(maxHoursToStart),
      kellyFraction,
      bookLimits,
      dailyBets: Math.round(dailyBets),
      fixedStake: fixedStake === null ? null : Math.round(fixedStake),
    },
  }
}

/** No single stake is ever suggested above this share of the bankroll. */
export const STAKE_CEILING = 0.05

export type StakePrefs = Pick<Preferences, 'bankroll' | 'kellyFraction' | 'bookLimits'> & {
  fixedStake?: number | null
}

/**
 * The stake the app suggests: a member's fixed amount when they set one,
 * otherwise `kellyFraction` of full Kelly. Either way never more than 5 % of
 * bankroll and never more than the book's limit, whole euros. A signal without
 * value gets nothing, fixed amount or not.
 */
export function suggestedStake(prefs: StakePrefs, book: BookName, odds: number, fairOdds: number): number {
  const b = odds - 1
  if (b <= 0 || fairOdds <= 1) return 0
  const p = 1 / fairOdds
  const fullKelly = Math.max(0, (b * p - (1 - p)) / b)
  if (fullKelly <= 0) return 0
  const ceiling = prefs.bankroll * STAKE_CEILING
  const stake = prefs.fixedStake ? Math.min(prefs.fixedStake, ceiling) : prefs.bankroll * Math.min(STAKE_CEILING, fullKelly * prefs.kellyFraction)
  const limit = prefs.bookLimits[book]
  return Math.floor(limit !== undefined ? Math.min(stake, limit) : stake)
}
