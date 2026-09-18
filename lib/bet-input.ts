import { BOOKS, type BookName } from '@/lib/landing-signals'
import { MARKET_FAMILIES, SPORT_KEYS } from '@/lib/signal-taxonomy'

/**
 * What POST /api/bets accepts. The route used to coerce whatever arrived with
 * String() and Number(), which let a 10 MB match name or an unknown bookmaker
 * reach the database. Every field is checked here instead, and the route stores
 * only what this returns.
 */

export type BetInput = {
  signalId: string | null
  sport: string
  match: string
  betDescription: string
  bookmaker: BookName
  odds: number
  stake: number
  marketType: string
  pickName: string | null
  line: number | null
  homeName: string | null
  awayName: string | null
  gameKey: string | null
  startsAt: Date | null
  entryFairProb: number | null
  eventKey: string | null
}

export type BetInputResult = { ok: true; value: BetInput } | { ok: false; error: string }

/** Every market name the publisher writes, plus the families' own keys. */
const MARKETS = new Set<string>([
  ...MARKET_FAMILIES.flatMap((family) => [...family.markets]),
  ...MARKET_FAMILIES.map((family) => family.key),
])

const SPORTS = new Set<string>([...SPORT_KEYS, 'OTHER'])

const MAX = { name: 200, description: 300, id: 64, key: 128 }

/** Odds a Lithuanian book will actually price, and stakes a person will actually make. */
const LIMITS = { odds: { min: 1.01, max: 1000 }, stake: { min: 0.01, max: 100_000 }, line: 500 }

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

export function parseBetInput(input: unknown): BetInputResult {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Trūksta statymo duomenų.' }
  const raw = input as Record<string, unknown>

  const match = text(raw.match, MAX.name)
  if (!match) return { ok: false, error: 'Trūksta rungtynių pavadinimo.' }

  const bookmaker = BOOKS.find((book) => book === raw.bookmaker)
  if (!bookmaker) return { ok: false, error: 'Nežinoma kontora.' }

  const odds = Number(raw.odds)
  if (!Number.isFinite(odds) || odds < LIMITS.odds.min || odds > LIMITS.odds.max) {
    return { ok: false, error: 'Koeficientas turi būti nuo 1,01 iki 1000.' }
  }

  const stake = Number(raw.stake)
  if (!Number.isFinite(stake) || stake < LIMITS.stake.min || stake > LIMITS.stake.max) {
    return { ok: false, error: 'Suma turi būti nuo 0,01 € iki 100 000 €.' }
  }

  const sportRaw = typeof raw.sport === 'string' ? raw.sport : 'OTHER'
  const sport = SPORTS.has(sportRaw) ? sportRaw : 'OTHER'

  const marketRaw = typeof raw.marketType === 'string' ? raw.marketType : 'moneyline'
  const marketType = MARKETS.has(marketRaw) ? marketRaw : 'other'

  const line = raw.line == null ? null : Number(raw.line)
  if (line !== null && (!Number.isFinite(line) || Math.abs(line) > LIMITS.line)) {
    return { ok: false, error: 'Netinkama linija.' }
  }

  let startsAt: Date | null = null
  if (raw.startsAt != null) {
    if (typeof raw.startsAt !== 'string' && typeof raw.startsAt !== 'number') {
      return { ok: false, error: 'Netinkamas rungtynių laikas.' }
    }
    const parsed = new Date(raw.startsAt)
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'Netinkamas rungtynių laikas.' }
    // A kick-off far outside this window is a broken client, not a real fixture.
    const year = 365 * 24 * 60 * 60 * 1000
    const now = Date.now()
    if (parsed.getTime() < now - year || parsed.getTime() > now + year) {
      return { ok: false, error: 'Rungtynių laikas per toli nuo šiandienos.' }
    }
    startsAt = parsed
  }

  const entryFairProb = Number(raw.entryFairProb)
  const fair = Number.isFinite(entryFairProb) && entryFairProb > 0 && entryFairProb < 1 ? entryFairProb : null

  return {
    ok: true,
    value: {
      signalId: text(raw.signalId, MAX.id),
      sport,
      match,
      betDescription: text(raw.betDescription, MAX.description) ?? '',
      bookmaker,
      odds,
      stake,
      marketType,
      pickName: text(raw.pickName, MAX.name),
      line,
      homeName: text(raw.homeName, MAX.name),
      awayName: text(raw.awayName, MAX.name),
      gameKey: text(raw.gameKey, MAX.key),
      startsAt,
      entryFairProb: fair,
      eventKey: text(raw.eventKey, MAX.id),
    },
  }
}
