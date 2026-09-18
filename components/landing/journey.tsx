'use client'

import NumberFlow from '@number-flow/react'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { edgeOf, formatEdge, formatEuro, formatOdds } from '@/lib/format-lt'
import { landingSignals } from '@/lib/landing-signals'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { BookMark } from './book-mark'
import { Reveal, useInViewOnce } from './motion-primitives'

// Real captured signals: one with all three books priced, plus two more for the alerts.
const scan = landingSignals.find((signal) => signal.id === 'breogan-rilski-hcp-home')!
const alert = landingSignals.find((signal) => signal.id === 'vef-absheron-total-171')!
const alertPrice = alert.prices.find((price) => price.book === alert.valueBook)!
const alertEdge = edgeOf(alertPrice.odds, alert.fairOdds)

const rows = [...scan.prices].sort((a, b) => b.odds - a.odds)

/** The three alerts of one cycle, newest last. */
const FEED = landingSignals
  .filter((signal) => signal.id !== scan.id)
  .slice(0, 3)
  .map((signal) => {
    const price = signal.prices.find((entry) => entry.book === signal.valueBook)!
    return {
      id: signal.id,
      book: signal.valueBook,
      event: price.event,
      selection: `${signal.market}: ${price.selection}`,
      odds: price.odds,
      edge: edgeOf(price.odds, signal.fairOdds),
    }
  })

// The scan replays the gap opening: the books drift up, the true price does not.
const DRIFT: Record<string, number> = { TopSport: -0.07, Betsson: -0.04, '7BET': -0.03 }

const STAKE = 7.5
const PAYOUT = STAKE * alertPrice.odds
const CLV = 0.041

const BEAT_MS = 2800
const STEP_OF_BEAT = [0, 1, 2, 2]

const CARD =
  'relative flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] bg-stand p-6 transition-[box-shadow,transform] duration-500 sm:p-7'
const CARD_ON = 'shadow-[inset_0_0_0_1px_var(--rail-strong),0_30px_70px_-45px_rgb(91_229_132/0.5)] sm:-translate-y-1.5'
const CARD_OFF = 'shadow-[inset_0_0_0_1px_var(--rail)]'
const PANEL = 'rounded-[16px] bg-night-deep p-3.5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.04)]'

export function Journey() {
  const [ref, seen] = useInViewOnce<HTMLDivElement>()
  const calm = useReducedMotion()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!seen || calm) return
    const id = setInterval(() => setTick((current) => current + 1), BEAT_MS)
    return () => clearInterval(id)
  }, [seen, calm])

  const beat = tick % 4
  const cycle = Math.floor(tick / 4)

  const step = calm ? 2 : STEP_OF_BEAT[beat]
  const scanning = !calm && beat === 0
  const placed = calm || beat === 3

  return (
    <section ref={ref} className="bg-night-alt px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div className="mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95]">Nuo kainos iki statymo</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-5 max-w-[62ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-haze">
            Pinnacle yra tiksliausia kontora pasaulyje. Kai lietuviška kontora už tą patį statymą siūlo daugiau nei ji, tą kainą kontora
            pastatė per aukštai — ir būtent tokias tau siunčiam.
          </p>
        </Reveal>

        <ol className="mt-[clamp(40px,5vw,72px)] grid gap-5 lg:grid-cols-3">
          <Step
            index={0}
            title="Randam, kur kontora permoka"
            blurb="Lyginam 7BET, TopSport ir Betsson koeficientus su Pinnacle. Kur lietuviška kontora moka daugiau, ten ir verta statyti."
            active={step === 0}
            beat={beat}
          >
            <div className={`${PANEL} mt-auto`}>
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <p className="flex items-center gap-2 text-[0.8125rem] text-haze">
                  <span className="relative flex size-1.5">
                    {scanning && <span className="absolute inline-flex size-full animate-[kr-ring_1.6s_ease-out_infinite] rounded-full bg-floodlight" />}
                    <span className="relative inline-flex size-1.5 rounded-full bg-floodlight" />
                  </span>
                  {scanning ? 'Skenuojam' : 'Rasta'}
                </p>
                <p className="truncate text-[0.8125rem] text-haze-dim">{scan.prices[0].event}</p>
              </div>
              <div className="relative grid gap-1.5 overflow-hidden rounded-[12px]">
                {scanning && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-10 h-12 animate-[kr-scan_1.4s_cubic-bezier(.45,0,.55,1)_infinite] bg-[linear-gradient(180deg,transparent,rgb(91_229_132/0.22),transparent)]"
                  />
                )}
                {rows.map((price) => {
                  const odds = scanning ? price.odds + (DRIFT[price.book] ?? 0) : price.odds
                  const beats = odds > scan.fairOdds
                  return (
                    <div
                      key={price.book}
                      className={`flex min-w-0 items-center gap-3 rounded-[12px] px-2.5 py-2 transition-colors duration-500 ${
                        beats && !scanning ? 'bg-floodlight/15 shadow-[inset_0_0_0_1px_var(--floodlight)]' : 'bg-night'
                      }`}
                    >
                      <BookMark book={price.book} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-[0.875rem]">{price.book}</span>
                      {beats && !scanning && (
                        <span
                          key={cycle}
                          className="kr-rise rounded-full bg-floodlight px-2 py-0.5 text-[0.75rem] font-bold text-night tnum"
                        >
                          {formatEdge(edgeOf(odds, scan.fairOdds))}
                        </span>
                      )}
                      <span className={`font-display text-[1.0625rem] font-bold tnum ${beats && !scanning ? 'text-floodlight' : ''}`}>
                        <NumberFlow value={odds} locales="lt-LT" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 flex justify-between gap-2 border-t border-rail/70 px-2.5 pt-2.5 text-[0.8125rem] text-haze">
                <span>Tiek verta iš tikrųjų (Pinnacle)</span>
                <span className="font-semibold text-chalk tnum">{formatOdds(scan.fairOdds)}</span>
              </p>
            </div>
          </Step>

          <Step
            index={1}
            title="Atsiunčiam tau signalą"
            blurb="Kiekviena rasta kaina atkeliauja į Telegram iškart po skenavimo. Pačiam ieškoti nieko nereikia."
            active={step === 1}
            beat={beat}
          >
            <div className={`${PANEL} mt-auto`}>
              <p className="pb-3 text-center text-[0.8125rem] text-haze-dim">
                <span className="block font-display text-[1.25rem] font-bold text-chalk tnum">13:36</span>
                Ketvirtadienis, rugsėjo 18
              </p>
              <div className="grid gap-2">
                {/* The newest arrives on the beat. Older ones step back through
                    their ground and scale, never by dimming the text: faded text
                    cannot hold its contrast. */}
                {(calm || beat >= 1 ? FEED : []).map((item, position, shown) => {
                  const newest = position === shown.length - 1
                  return (
                    <div
                      // Keyed by the loop, so every pass replays the arrivals.
                      key={`${item.id}-${cycle}`}
                      style={{ animationDelay: `${position * 260}ms` }}
                      className={`flex min-w-0 origin-bottom items-center gap-2.5 rounded-[14px] px-3 py-2.5 ${
                        newest ? 'bg-stand-hover shadow-[inset_0_0_0_1px_var(--floodlight)]' : 'bg-stand'
                      } ${calm ? '' : 'kr-row-drop'}`}
                    >
                      <BookMark book={item.book} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.8125rem] text-haze">
                          Statyk · naujas signalas <span className={newest ? 'text-floodlight' : ''}>dabar</span>
                        </span>
                        <span className="block truncate text-[0.875rem]">
                          {item.event} · {item.book} {formatOdds(item.odds)}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[0.75rem] font-bold tnum ${
                          newest ? 'bg-floodlight text-night' : 'bg-floodlight/15 text-floodlight'
                        }`}
                      >
                        {formatEdge(item.edge)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </Step>

          <Step
            index={2}
            title="Pastatai per pusę minutės"
            blurb="Suma jau suskaičiuota pagal tavo banką. Belieka pastatyti, kol kontora kainos neištaisė."
            active={step === 2}
            beat={beat}
          >
            <div className={`${PANEL} relative mt-auto`}>
              <div className={`transition-all duration-500 ${placed ? 'opacity-30 blur-[2px]' : ''}`}>
                <div className="flex items-start gap-3">
                  <BookMark book={alertPrice.book} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium">{alertPrice.event}</p>
                    <p className="truncate text-[0.8125rem] text-haze">
                      {alert.market}: {alertPrice.selection}
                    </p>
                  </div>
                  <p className="font-display text-[1.25rem] font-bold tnum">{formatOdds(alertPrice.odds)}</p>
                </div>
                <dl className="mt-3.5 grid gap-1.5 border-t border-rail/70 pt-3 text-[0.875rem]">
                  <div className="flex justify-between gap-2 text-haze">
                    <dt>Statymo suma (¼ Kelly)</dt>
                    <dd className="font-semibold text-chalk tnum">{formatEuro(STAKE, 2)}</dd>
                  </div>
                  <div className="flex justify-between gap-2 text-haze">
                    <dt>Galimas laimėjimas</dt>
                    <dd className="font-semibold text-floodlight tnum">{formatEuro(PAYOUT, 2)}</dd>
                  </div>
                </dl>
                <p className={`mt-4 flex h-11 items-center justify-center rounded-xl bg-floodlight font-semibold text-night ${placed ? '' : 'kr-cta-glow'}`}>
                  Statyti {formatEuro(STAKE, 2)}
                </p>
              </div>

              {placed && (
                <div className="kr-fade absolute inset-0 grid place-content-center justify-items-center gap-2.5 rounded-[16px] bg-night-deep/92 px-5 text-center">
                  <span className="kr-pop grid size-12 place-items-center rounded-full bg-floodlight">
                    <Check className="size-6 text-night" strokeWidth={3} aria-hidden />
                  </span>
                  <p className="font-display text-[1.25rem] font-bold">Statymas įrašytas</p>
                  <p className="rounded-full bg-floodlight/15 px-3 py-1 text-[0.875rem] font-semibold text-floodlight tnum">
                    {formatEuro(STAKE, 2)} @ {formatOdds(alertPrice.odds)} · {formatEdge(alertEdge)} vertė
                  </p>
                  <p className="text-[0.8125rem] text-haze">
                    Rezultatas ir uždarymo kaina užpildomi patys · CLV{' '}
                    <span className="font-semibold text-floodlight tnum">{formatEdge(CLV)}</span>
                  </p>
                </div>
              )}
            </div>
          </Step>
        </ol>
      </div>
    </section>
  )
}

function Step({
  index,
  title,
  blurb,
  active,
  beat,
  children,
}: {
  index: number
  title: string
  blurb: string
  active: boolean
  beat: number
  children: React.ReactNode
}) {
  return (
    <li>
      <Reveal variant="scale" delay={index * 60} className={`${CARD} ${active ? CARD_ON : CARD_OFF}`}>
        {/* The bar drains through the beat, so the section always has a clock running. */}
        <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-rail/60">
          {active && (
            <span key={beat} className="block h-full origin-left bg-floodlight" style={{ animation: `kr-fill ${BEAT_MS}ms linear forwards` }} />
          )}
        </span>
        <div className="flex items-center gap-3">
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full font-display text-[0.9375rem] font-bold transition-colors duration-500 ${
              active ? 'bg-floodlight text-night' : 'bg-rail/60 text-haze'
            }`}
          >
            {index + 1}
          </span>
          <h3 className="text-[clamp(1.25rem,1.8vw,1.5rem)] tracking-[-0.02em]">{title}</h3>
        </div>
        <p className="mt-3.5 mb-6 text-[0.9375rem] text-haze">{blurb}</p>
        {children}
      </Reveal>
    </li>
  )
}
