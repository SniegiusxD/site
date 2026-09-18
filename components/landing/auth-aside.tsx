'use client'

import NumberFlow from '@number-flow/react'
import { useEffect, useState } from 'react'
import { edgeOf, formatEdge, formatOdds } from '@/lib/format-lt'
import { landingSignals } from '@/lib/landing-signals'
import type { PublicStats } from '@/lib/public-stats'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { BookMark } from './book-mark'

/** Newest first, the way the feed delivers them. */
const FEED = landingSignals.map((signal) => {
  const price = signal.prices.find((entry) => entry.book === signal.valueBook)!
  return {
    id: signal.id,
    book: signal.valueBook,
    event: price.event,
    line: `${signal.market}: ${price.selection}`,
    kickoff: signal.kickoffLabel,
    odds: price.odds,
    edge: edgeOf(price.odds, signal.fairOdds),
    fairOdds: signal.fairOdds,
  }
})

const BEAT_MS = 2800
const DEPTH = [
  { opacity: 1, scale: 1 },
  { opacity: 0.6, scale: 0.97 },
  { opacity: 0.28, scale: 0.94 },
]

/**
 * The panel beside the sign-up form: signals arriving one by one, the way they
 * arrive inside. No filters, no locked rows — this page has one job.
 */
export function AuthAside({ stats }: { stats: PublicStats | null }) {
  const calm = useReducedMotion()
  const [head, setHead] = useState(FEED.length - 1)

  useEffect(() => {
    if (calm) return
    const id = setInterval(() => setHead((current) => (current + 1) % FEED.length), BEAT_MS)
    return () => clearInterval(id)
  }, [calm])

  const visible = [0, 1, 2].map((depth) => ({
    key: head - depth,
    depth,
    signal: FEED[(head - depth + FEED.length * 2) % FEED.length],
  }))

  const perDay = stats?.any ?? null

  return (
    <div className="w-full max-w-[27rem]">
      <div className="flex items-center gap-2.5 text-[0.9375rem] text-haze">
        <span className="relative flex size-2">
          {!calm && <span className="absolute inline-flex size-full animate-[kr-ring_2s_ease-out_infinite] rounded-full bg-floodlight" />}
          <span className="relative inline-flex size-2 rounded-full bg-floodlight" />
        </span>
        Skenuojam maždaug kas 40 minučių
      </div>

      <h2 className="mt-4 text-[clamp(1.75rem,2.4vw,2.4rem)] leading-[1.02]">
        {perDay ? (
          <>
            Per parą radom{' '}
            <span className="text-floodlight tnum">
              <NumberFlow value={perDay} locales="lt-LT" />
            </span>{' '}
            per dideles kainas
          </>
        ) : (
          'Kainos, kurias kontoros pastatė per aukštai'
        )}
      </h2>

      <div className="relative mt-8 grid gap-3">
        {visible.map(({ key, depth, signal }) => (
          <article
            key={key}
            className={`origin-top rounded-[18px] bg-stand p-4 shadow-[inset_0_0_0_1px_var(--rail)] ${depth === 0 && !calm ? 'kr-row-drop' : ''}`}
            style={{ opacity: DEPTH[depth].opacity, transform: `scale(${DEPTH[depth].scale})` }}
            aria-hidden={depth > 0}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[0.9375rem] font-medium">{signal.event}</p>
                <p className="mt-1 truncate text-[0.8125rem] text-haze">{signal.line}</p>
              </div>
              <p className="shrink-0 text-right">
                <span className="font-display text-[1.25rem] font-bold text-floodlight tnum">{formatEdge(signal.edge)}</span>
                <span className="mt-0.5 block text-[0.8125rem] text-haze">vertė</span>
              </p>
            </div>
            <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-rail pt-3 text-[0.875rem]">
              <span className="flex items-center gap-2 font-medium">
                <BookMark book={signal.book} size="sm" />
                {signal.book}
              </span>
              <span className="text-haze">
                koef. <span className="font-semibold text-chalk tnum">{formatOdds(signal.odds)}</span> · tikroji{' '}
                <span className="tnum">{formatOdds(signal.fairOdds)}</span>
              </span>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-8 text-[0.9375rem] text-haze">
        Kiekvienas signalas ateina su visų trijų kontorų kainomis, tikrąja kaina be Pinnacle maržos ir siūloma suma pagal tavo banką.
      </p>
    </div>
  )
}
