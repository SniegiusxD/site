import { clvOf, type PastSignal, selectionText } from '@/lib/public-results'
import { sportName } from '@/lib/sports-lt'

/**
 * One finished signal as the landing hero replays it: the price we found, the
 * close it was measured against, and the CLV between them.
 *
 * Deliberately no bookmaker: a public page that names a betting company counts
 * as gambling advertising (ALĮ 10 str. 19 d.), so the type has no field for one.
 */
export type HeroRecordSignal = {
  id: string
  sport: string
  event: string
  pick: string
  /** The price we published. */
  odds: number
  /** Pinnacle's de-vigged closing price (1 / closing fair probability). */
  closeOdds: number
  clv: number
}

/**
 * The most recent started signals with a captured close, newest first. Anything
 * that has not started is dropped here as well as in the SQL: a signal a member
 * could still bet on must never reach a public page.
 */
export function heroRecordSignals(past: PastSignal[] | null, now: Date, limit = 6): HeroRecordSignal[] {
  if (!past) return []
  const out: HeroRecordSignal[] = []
  for (const signal of past) {
    if (!(Date.parse(signal.startsAt) < now.getTime())) continue
    const clv = clvOf(signal)
    if (clv === null || !signal.closingFairProb) continue
    out.push({
      id: signal.id,
      sport: sportName(signal.sport),
      event: signal.home && signal.away ? `${signal.home} – ${signal.away}` : signal.home || signal.away || '—',
      pick: selectionText(signal),
      odds: signal.odds,
      closeOdds: 1 / signal.closingFairProb,
      clv,
    })
    if (out.length >= limit) break
  }
  return out
}
