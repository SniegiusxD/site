'use client'

import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { Check, RotateCcw, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { edgeOf, formatEdge, formatEuro, formatOdds, kellyFraction } from '@/lib/format-lt'
import { BOOKS, type LandingSignal, landingSignals, SIGNALS_CAPTURED_LABEL } from '@/lib/landing-signals'
import { BookMark } from './book-mark'

const EASE = [0.22, 1, 0.36, 1] as const
const BANKROLL = 500

const byId = (id: string) => landingSignals.find((signal) => signal.id === id)!
// One real signal travels through all three steps; two more fill the chat.
const HERO = byId('vef-absheron-total-171')
const CHAT = [HERO, byId('parks-bejlek-games-hcp'), byId('breogan-rilski-hcp-home')]

const valuePrice = (signal: LandingSignal) => signal.prices.find((price) => price.book === signal.valueBook) ?? signal.prices[0]
const stakeFor = (signal: LandingSignal) => {
  const price = valuePrice(signal)
  return Math.floor(BANKROLL * Math.min(0.05, kellyFraction(price.odds, 1 / signal.fairOdds) * 0.25))
}

export function Journey() {
  const ref = useRef<HTMLDivElement>(null)
  // Starts as soon as a fifth of the steps is on screen; the whole sequence takes about 1.5 s,
  // so nobody who scrolls quickly meets empty cards.
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const reduced = useReducedMotion()
  const play = inView || Boolean(reduced)

  return (
    <section aria-labelledby="journey-title" className="border-t border-rail">
      <div className="mx-auto max-w-[80rem] px-5 py-24 sm:px-8 lg:py-32">
        <div className="max-w-[44rem]">
          <h2 id="journey-title" className="text-[3rem] sm:text-[4rem]">
            Nuo kontoros klaidos iki tavo statymo
          </h2>
          <p className="mt-6 text-[1.1rem] text-haze">
            Vienas tikras signalas, kelias nuo skenavimo iki pažymėto statymo. Kontoras skenuojam maždaug kas 30 minučių, pranešimas ateina
            iškart po skenavimo.
          </p>
        </div>

        <div ref={ref} className="mt-14 grid gap-10 lg:grid-cols-3 lg:items-start lg:gap-6">
          <Step number={1} title="Randam kainą" body="Lyginam kiekvienos kontoros koeficientą su Pinnacle kaina be maržos.">
            <ScanVisual play={play} reduced={Boolean(reduced)} />
          </Step>
          <Step number={2} title="Pranešam" body="Signalas atsiranda programėlėje ir, jei nori, Telegram su visais skaičiais.">
            <ChatVisual play={play} reduced={Boolean(reduced)} />
          </Step>
          <Step number={3} title="Tu pastatai" body="Nukopijuoji pavadinimą, pastatai savo kontoroje ir pažymi. Rezultatą suvedam patys.">
            <SlipVisual play={play} reduced={Boolean(reduced)} />
          </Step>
        </div>

        <p className="mt-10 text-[0.9rem] text-haze-dim">Signalai iš mūsų skenavimo, {SIGNALS_CAPTURED_LABEL}. Suma skaičiuota 500 € bankrollui.</p>
      </div>
    </section>
  )
}

function Step({ number, title, body, children }: { number: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex items-start gap-4">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-chalk font-display text-xl font-extrabold text-night">
          {number}
        </span>
        <div>
          <h3 className="text-[2rem]">{title}</h3>
          <p className="mt-2 text-haze">{body}</p>
        </div>
      </div>
      <div className="mt-6 flex-1">{children}</div>
    </div>
  )
}

function ScanVisual({ play, reduced }: { play: boolean; reduced: boolean }) {
  const rows = BOOKS.map((book) => HERO.prices.find((price) => price.book === book) ?? { book, odds: null })
  const low = 1.6
  const high = 2.05
  const at = (odds: number) => ((odds - low) / (high - low)) * 100
  const fairAt = at(HERO.fairOdds)

  return (
    <div className="lift relative overflow-hidden rounded-2xl bg-stand p-5">
      <p className="font-medium">{valuePrice(HERO).event}</p>
      <p className="text-[0.9rem] text-haze">
        {HERO.market}: {valuePrice(HERO).selection}
      </p>
      <div className="mt-5 space-y-3.5">
        {rows.map((row, index) => {
          const clears = row.odds !== null && row.odds > HERO.fairOdds
          return (
            <div key={row.book} className="grid grid-cols-[auto_4.5rem_minmax(0,1fr)_2.75rem] items-center gap-2.5">
              <BookMark book={row.book} size="sm" />
              <span className="text-[0.95rem]">{row.book}</span>
              {row.odds === null ? (
                <span className="col-span-2 text-[0.85rem] text-haze-dim">kainos neradom</span>
              ) : (
                <>
                  <span aria-hidden className="relative h-2.5 rounded-full bg-rail">
                    <span className="absolute inset-y-0 left-0 rounded-l-full bg-steel" style={{ width: `${Math.min(at(row.odds), fairAt)}%` }} />
                    {clears && (
                      <motion.span
                        className="absolute inset-y-0 rounded-r-full bg-floodlight"
                        style={{ left: `${fairAt}%` }}
                        initial={reduced ? { width: `${at(row.odds) - fairAt}%` } : { width: 0 }}
                        animate={play ? { width: `${at(row.odds) - fairAt}%` } : undefined}
                        transition={{ duration: 0.6, ease: EASE, delay: reduced ? 0 : 0.15 + index * 0.15 }}
                      />
                    )}
                    <span className="absolute -inset-y-1.5 w-0.5 rounded bg-chalk" style={{ left: `calc(${fairAt}% - 1px)` }} />
                  </span>
                  <span className={`text-right font-semibold tnum ${clears ? 'text-floodlight' : ''}`}>{formatOdds(row.odds)}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-rail pt-4 text-[0.9rem]">
        <span className="text-haze">Tikroji kaina {formatOdds(HERO.fairOdds)}</span>
        <span className="font-semibold text-floodlight">{formatEdge(edgeOf(valuePrice(HERO).odds, HERO.fairOdds))} Betsson</span>
      </div>
      {!reduced && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-24 bg-[linear-gradient(90deg,transparent,rgb(238_242_247/0.07),transparent)]"
          initial={{ left: '-6rem' }}
          animate={play ? { left: '110%' } : undefined}
          transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.1 }}
        />
      )}
    </div>
  )
}

const CARD_HEIGHT = 164
const CARD_GAP = 10
const STACK_SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const

/*
 * Adapted from the 21st.dev component "Notification List" by skyleen77 (retrieved
 * 2026-09-15): cards arrive as a tight stack, then fan out. Reworked for Telegram
 * alerts in this site's palette; it fans out by itself once in view, and moves by
 * transform only inside a box of fixed height, so nothing around it shifts.
 */
function ChatVisual({ play, reduced }: { play: boolean; reduced: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!play) return
    const timer = window.setTimeout(() => setOpen(true), reduced ? 0 : 750)
    return () => window.clearTimeout(timer)
  }, [play, reduced])

  return (
    <div className="lift rounded-[1.75rem] bg-night-deep p-4 hairline">
      <div className="flex items-center justify-between gap-2 border-b border-rail px-1 pb-3 text-[0.85rem] text-haze">
        <span className="flex items-center gap-2">
          <Send className="size-4" aria-hidden />
          Telegram
        </span>
        <span className="rounded-full bg-rail px-2 py-0.5 text-[0.8rem] font-semibold text-chalk">{CHAT.length} nauji</span>
      </div>
      <ul className="relative mt-3" style={{ height: CHAT.length * CARD_HEIGHT + (CHAT.length - 1) * CARD_GAP }}>
        {CHAT.map((signal, index) => {
          const price = valuePrice(signal)
          const stacked = { y: index * 12, scale: 1 - index * 0.05, opacity: 1 - index * 0.2 }
          const fanned = { y: index * (CARD_HEIGHT + CARD_GAP), scale: 1, opacity: 1 }
          return (
            <motion.li
              key={signal.id}
              initial={reduced ? false : { ...stacked, opacity: 0, y: stacked.y + 36 }}
              animate={play ? (open ? fanned : stacked) : undefined}
              transition={{ ...STACK_SPRING, delay: open ? index * 0.06 : reduced ? 0 : 0.1 + index * 0.1 }}
              style={{ zIndex: CHAT.length - index, height: CARD_HEIGHT, transformOrigin: 'top center' }}
              className="absolute inset-x-0 top-0 overflow-hidden rounded-2xl rounded-tl-md bg-stand px-3.5 py-3 text-[0.9rem] shadow-[0_12px_28px_-14px_rgb(0_0_0/0.9)]"
            >
              <p>
                <span className="font-semibold text-floodlight">{formatEdge(edgeOf(price.odds, signal.fairOdds))}</span>{' '}
                <span className="text-haze">{price.book}</span> <span className="font-semibold">{formatOdds(price.odds)}</span>
              </p>
              <p className="mt-0.5 truncate font-medium">{price.event}</p>
              <p className="truncate text-haze">{price.selection}</p>
              <p className="mt-1.5 text-haze">
                Tikroji kaina {formatOdds(signal.fairOdds)}. Suma <span className="font-semibold text-chalk">{formatEuro(stakeFor(signal))}</span>
              </p>
              <span className="mt-2 block rounded-lg bg-rail py-1.5 text-center text-[0.85rem] font-medium">Sekti statymą</span>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

function SlipVisual({ play, reduced }: { play: boolean; reduced: boolean }) {
  const [marked, setMarked] = useState(false)
  const price = valuePrice(HERO)
  const stake = stakeFor(HERO)

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={play ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: EASE, delay: reduced ? 0 : 0.5 }}
      className="lift flex flex-col rounded-2xl bg-stand p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BookMark book={price.book} />
          <div className="min-w-0">
            <p className="truncate font-medium">{price.event}</p>
            <p className="truncate text-[0.9rem] text-haze">{price.selection}</p>
          </div>
        </div>
        <p className="font-display text-[2rem] leading-none font-bold tnum">{formatOdds(price.odds)}</p>
      </div>
      <dl className="mt-5 space-y-2 border-t border-rail pt-4 text-[0.95rem]">
        <div className="flex justify-between">
          <dt className="text-haze">Suma (¼ Kelly)</dt>
          <dd className="font-semibold">{formatEuro(stake)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-haze">Galimas laimėjimas</dt>
          <dd className="font-semibold">+{formatEuro(stake * (price.odds - 1), 2)}</dd>
        </div>
      </dl>
      <div className="pt-6">
        <AnimatePresence mode="wait" initial={false}>
          {marked ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex h-12 items-center justify-between gap-3 rounded-xl bg-pitch-soft px-4 font-semibold text-pitch"
            >
              <span className="flex items-center gap-2">
                <Check className="size-5" aria-hidden />
                Pažymėta, rezultatą suvesim
              </span>
              <button type="button" onClick={() => setMarked(false)} aria-label="Pradėti iš naujo" className="grid size-8 place-items-center rounded-lg hover:bg-pitch-soft">
                <RotateCcw className="size-4" aria-hidden />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="mark"
              type="button"
              onClick={() => setMarked(true)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-12 w-full rounded-xl bg-chalk font-semibold text-night transition-transform hover:bg-white active:scale-[0.98]"
            >
              Pastačiau {formatEuro(stake)} už {formatOdds(price.odds)}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
