'use client'

import { useEffect, useRef, useState } from 'react'
import { edgeOf, formatEdge, formatEuro, formatInteger, formatOdds, kellyFraction } from '@/lib/format-lt'
import { type LandingSignal, SIGNALS_CAPTURED_LABEL, landingSignals } from '@/lib/landing-signals'
import type { PublicStats } from '@/lib/public-stats'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { BookMark } from './book-mark'

const DEMO_BANKROLL = 500
const CYCLE_MS = 5200

const valuePrice = (signal: LandingSignal) => signal.prices.find((price) => price.book === signal.valueBook) ?? signal.prices[0]
const edgeFor = (signal: LandingSignal) => edgeOf(valuePrice(signal).odds, signal.fairOdds)

/** Quarter Kelly, never more than 5 % of the bankroll: the app's own rule. */
const stakeFor = (signal: LandingSignal) =>
  DEMO_BANKROLL * Math.min(0.05, kellyFraction(valuePrice(signal).odds, 1 / signal.fairOdds) * 0.25)

/** The three best captured signals, richest one first. */
const ROWS = [...landingSignals].sort((a, b) => edgeFor(b) - edgeFor(a)).slice(0, 3)

/**
 * The hero panel: three real captured signals, one open at a time. No filter
 * chrome and no blurred teasers — the point is to show what a signal contains,
 * not to imitate the whole app.
 */
export function HeroBoard({ stats }: { stats: PublicStats | null }) {
  const calm = useReducedMotion()
  const [open, setOpen] = useState(0)
  const [held, setHeld] = useState(false)
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (calm || held) return
    const id = setInterval(() => setOpen((current) => (current + 1) % ROWS.length), CYCLE_MS)
    return () => clearInterval(id)
  }, [calm, held])

  const perDay = stats?.any ?? null

  return (
    <div
      ref={frame}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      className="overflow-hidden rounded-[22px] bg-stand shadow-[inset_0_0_0_1px_var(--rail-strong),0_40px_90px_-50px_rgb(0_0_0/0.9)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-rail px-5 py-4">
        <p className="flex items-center gap-2.5 font-display text-[1.125rem] font-bold">
          Signalai
          <span className="relative flex size-2">
            {!calm && <span className="absolute inline-flex size-full animate-[kr-ring_2s_ease-out_infinite] rounded-full bg-floodlight" />}
            <span className="relative inline-flex size-2 rounded-full bg-floodlight" />
          </span>
          <span className="text-[0.875rem] font-medium text-haze">gyvai</span>
        </p>
        {perDay !== null && (
          <p className="text-[0.875rem] text-haze">
            <span className="font-semibold text-chalk tnum">{formatInteger(perDay)}</span> per parą
          </p>
        )}
      </div>

      <ul>
        {ROWS.map((signal, index) => {
          const price = valuePrice(signal)
          const active = index === open
          const edge = edgeFor(signal)
          // One axis for this selection: every book's price, and the true price marked.
          const odds = signal.prices.map((entry) => entry.odds)
          const low = Math.min(signal.fairOdds, ...odds) * 0.97
          const high = Math.max(signal.fairOdds, ...odds) * 1.02
          const at = (value: number) => ((value - low) / (high - low)) * 100

          return (
            <li key={signal.id} className={`border-b border-rail last:border-b-0 ${active ? 'bg-stand-hover' : ''}`}>
              <button
                type="button"
                onClick={() => setOpen(index)}
                aria-expanded={active}
                className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-stand-hover"
              >
                <BookMark book={signal.valueBook} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-medium">{price.event}</span>
                  <span className="block truncate text-[0.8125rem] text-haze">
                    {signal.market}: {price.selection}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-[1.125rem] font-bold text-floodlight tnum">{formatEdge(edge)}</span>
                  <span className="block text-[0.8125rem] text-haze tnum">koef. {formatOdds(price.odds)}</span>
                </span>
              </button>

              {/* Grid rows animate height without measuring anything. */}
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
                  active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden" inert={!active}>
                  <div className="grid gap-2 px-5 pb-4">
                    {signal.prices.map((entry) => {
                      const beats = entry.odds > signal.fairOdds
                      return (
                        <div key={entry.book} className="flex min-w-0 items-center gap-3">
                          <BookMark book={entry.book} size="sm" />
                          <span className="w-[4.5rem] shrink-0 truncate text-[0.8125rem] text-haze">{entry.book}</span>
                          <span className="relative h-2.5 flex-1 rounded-full bg-night-deep">
                            <span
                              className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ${beats ? 'bg-floodlight' : 'bg-steel'}`}
                              style={{ width: active ? `${at(entry.odds)}%` : '0%' }}
                            />
                            <span className="absolute -inset-y-1 w-px bg-chalk/70" style={{ left: `${at(signal.fairOdds)}%` }} aria-hidden />
                          </span>
                          <span className={`w-[3rem] shrink-0 text-right text-[0.875rem] font-semibold tnum ${beats ? 'text-floodlight' : 'text-chalk'}`}>
                            {formatOdds(entry.odds)}
                          </span>
                        </div>
                      )
                    })}
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-rail pt-3 text-[0.8125rem] text-haze">
                      <span>
                        Tikroji kaina <span className="font-semibold text-chalk tnum">{formatOdds(signal.fairOdds)}</span> · Pinnacle su marža{' '}
                        <span className="tnum">{formatOdds(signal.pinnacleOdds)}</span>
                      </span>
                      <span>
                        Siūloma suma <span className="font-semibold text-chalk tnum">{formatEuro(stakeFor(signal), 2)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="border-t border-rail px-5 py-3 text-[0.8125rem] text-haze-dim">
        Tikri signalai iš mūsų skenavimo, {SIGNALS_CAPTURED_LABEL}. Suma skaičiuota {formatEuro(DEMO_BANKROLL)} bankrollui.
      </p>
    </div>
  )
}
