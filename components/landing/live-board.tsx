'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { edgeOf, formatEdge, formatEuro, formatOdds, kellyFraction } from '@/lib/format-lt'
import {
  BOOKS,
  type BookName,
  type LandingSignal,
  landingSignals,
  SIGNALS_CAPTURED_LABEL,
} from '@/lib/landing-signals'
import { BookMark } from './book-mark'
import { CopyButton } from './copy-button'

const CYCLE_MS = 5200
const DEMO_BANKROLL = 500
const EASE = [0.22, 1, 0.36, 1] as const

function valuePrice(signal: LandingSignal) {
  return signal.prices.find((price) => price.book === signal.valueBook) ?? signal.prices[0]
}

/** Quarter Kelly capped at 5 % of bankroll, the aggregator's rule. */
function suggestedStake(odds: number, fairOdds: number): number {
  return Math.round(DEMO_BANKROLL * Math.min(0.05, kellyFraction(odds, 1 / fairOdds) * 0.25))
}

export function LiveBoard() {
  const reduced = useReducedMotion()
  const [enabled, setEnabled] = useState<Set<BookName>>(() => new Set(BOOKS))
  const [selectedId, setSelectedId] = useState<string>(landingSignals[0].id)
  const [touched, setTouched] = useState(false)

  const visible = useMemo(
    () => landingSignals.filter((signal) => enabled.has(signal.valueBook)),
    [enabled],
  )

  // Walk through the signals until the visitor takes over.
  useEffect(() => {
    if (touched || reduced || visible.length < 2) return
    const timer = window.setInterval(() => {
      setSelectedId((current) => {
        const index = visible.findIndex((signal) => signal.id === current)
        return visible[(index + 1) % visible.length].id
      })
    }, CYCLE_MS)
    return () => window.clearInterval(timer)
  }, [touched, reduced, visible])

  function toggleBook(book: BookName) {
    setTouched(true)
    setEnabled((current) => {
      const next = new Set(current)
      if (next.has(book) && next.size > 1) next.delete(book)
      else next.add(book)
      return next
    })
  }

  const best = Math.max(...visible.map((signal) => edgeOf(valuePrice(signal).odds, signal.fairOdds)))

  return (
    <div className="lift overflow-hidden rounded-2xl bg-stand">
      <div className="flex items-center justify-between gap-4 border-b border-rail px-5 py-4">
        <div className="flex items-baseline gap-3">
          <p className="font-display text-2xl font-extrabold">Signalai</p>
          <p className="flex items-center gap-1.5 text-[0.9rem] text-pitch">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-pitch opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-pitch" />
            </span>
            <span className="tnum">{visible.length}</span> gyvai
          </p>
        </div>
        <p className="text-[0.85rem] text-haze">
          geriausia <span className="font-semibold text-floodlight tnum">{formatEdge(best)}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-rail px-5 py-3" role="group" aria-label="Kontoros">
        {BOOKS.map((book) => {
          const on = enabled.has(book)
          return (
            <button
              key={book}
              type="button"
              aria-pressed={on}
              onClick={() => toggleBook(book)}
              className={`inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[0.9rem] font-medium transition-[background-color,color,opacity] duration-200 ${
                on ? 'bg-rail text-chalk' : 'bg-transparent text-haze-dim opacity-70 hover:opacity-100'
              }`}
            >
              <BookMark book={book} size="sm" />
              {book}
            </button>
          )
        })}
      </div>

      <motion.ul layout className="max-h-[27rem] overflow-y-auto" aria-label="Signalų sąrašas">
        <AnimatePresence initial={false}>
          {visible.map((signal) => {
            const open = signal.id === selectedId
            const price = valuePrice(signal)
            const edge = edgeOf(price.odds, signal.fairOdds)
            return (
              <motion.li
                key={signal.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={`border-b border-rail last:border-b-0 ${open ? 'bg-stand-hover' : ''}`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => {
                    setTouched(true)
                    setSelectedId(signal.id)
                  }}
                  className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-stand-hover"
                >
                  <BookMark book={price.book} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{price.event}</span>
                    <span className="block truncate text-[0.9rem] text-haze">
                      {signal.sport}, {signal.kickoffLabel}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-[1.6rem] leading-none font-bold tnum">
                      {formatOdds(price.odds)}
                    </span>
                    <span className="mt-1 block text-[0.9rem] font-semibold text-floodlight tnum">
                      {formatEdge(edge)}
                    </span>
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <SignalDetail signal={signal} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </motion.ul>

      <p className="border-t border-rail px-5 py-3 text-[0.8rem] text-haze-dim">
        Tikri signalai iš mūsų skenavimo, {SIGNALS_CAPTURED_LABEL}. Suma skaičiuota 500 € bankrollui.
      </p>
    </div>
  )
}

function SignalDetail({ signal }: { signal: LandingSignal }) {
  const price = valuePrice(signal)
  const all = [...signal.prices].sort((a, b) => b.odds - a.odds)
  const low = Math.min(signal.fairOdds, ...all.map((p) => p.odds)) * 0.94
  const high = Math.max(signal.fairOdds, ...all.map((p) => p.odds)) * 1.02
  const at = (odds: number) => ((odds - low) / (high - low)) * 100
  const fairAt = at(signal.fairOdds)
  const stake = suggestedStake(price.odds, signal.fairOdds)

  return (
    <div className="px-5 pt-1 pb-5">
      <p className="text-[0.95rem]">
        <span className="text-haze">{signal.market}: </span>
        <span className="font-medium">{price.selection}</span>
      </p>

      <div className="mt-4 space-y-2.5">
        {all.map((row) => {
          const rowAt = at(row.odds)
          const clears = row.odds > signal.fairOdds
          return (
            <div key={row.book} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3">
              <span className="text-[0.9rem] text-haze">{row.book}</span>
              <span aria-hidden className="relative h-2.5 rounded-full bg-rail">
                <span
                  className="absolute inset-y-0 left-0 rounded-l-full bg-haze-dim"
                  style={{ width: `${Math.min(rowAt, fairAt)}%` }}
                />
                {clears && (
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${rowAt - fairAt}%` }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
                    className="absolute inset-y-0 rounded-r-full bg-floodlight"
                    style={{ left: `${fairAt}%` }}
                  />
                )}
                <span
                  className="absolute -inset-y-1.5 w-0.5 rounded bg-chalk"
                  style={{ left: `calc(${fairAt}% - 1px)` }}
                />
              </span>
              <span className={`text-right font-semibold tnum ${clears ? 'text-floodlight' : ''}`}>
                {formatOdds(row.odds)}
              </span>
            </div>
          )
        })}
        {BOOKS.filter((book) => !signal.prices.some((p) => p.book === book)).map((book) => (
          <div key={book} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
            <span className="text-[0.9rem] text-haze-dim">{book}</span>
            <span className="text-[0.85rem] text-haze-dim">kainos neradom</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[0.85rem] text-haze">
        Pinnacle {formatOdds(signal.pinnacleOdds)} su marža, tikroji kaina{' '}
        <span className="font-semibold text-chalk tnum">{formatOdds(signal.fairOdds)}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-night/60 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[0.8rem] text-haze">Pavadinimas {price.book} paieškai</p>
          <p className="truncate font-medium">{price.event}</p>
        </div>
        <CopyButton text={price.event} label={price.event} />
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <p className="text-[0.9rem] text-haze">Siūloma suma</p>
        <p className="font-display text-2xl font-bold tnum">{formatEuro(stake)}</p>
      </div>
    </div>
  )
}
