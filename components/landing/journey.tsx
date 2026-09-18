'use client'

import NumberFlow from '@number-flow/react'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { edgeOf, formatEdge, formatEuro, formatOdds } from '@/lib/format-lt'
import { landingSignals } from '@/lib/landing-signals'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { Reveal, useInViewOnce } from './motion-primitives'

// Real captured signals: one with all three books priced, one Betsson total for the alert.
const scan = landingSignals.find((signal) => signal.id === 'breogan-rilski-hcp-home')!
const alert = landingSignals.find((signal) => signal.id === 'vef-absheron-total-171')!
const alertPrice = alert.prices.find((price) => price.book === alert.valueBook)!
const alertEdge = edgeOf(alertPrice.odds, alert.fairOdds)

const rows = [...scan.prices].sort((a, b) => b.odds - a.odds)
const previous = scan.prices.find((price) => price.book === scan.valueBook)!

/**
 * Two consecutive scans of the same selection. The section replays the gap
 * opening: the book drifts up while the true price stays where it is.
 */
const DRIFT: Record<string, number> = { TopSport: -0.07, Betsson: -0.04, '7BET': -0.03 }

const STAKE = 7.5
const PAYOUT = STAKE * alertPrice.odds
const PROFIT = PAYOUT - STAKE
const CLV = 0.041

/** One beat of the loop. Four beats: scan, alert, bet, result. */
const BEAT_MS = 3400
const STEP_OF_BEAT = [0, 1, 2, 2]

const CARD = 'relative flex h-full min-w-0 flex-col overflow-hidden rounded-[20px] p-6 transition-[background-color,box-shadow,transform] duration-500'
const CARD_ON = 'bg-stand shadow-[inset_0_0_0_1px_var(--rail-strong),0_24px_60px_-40px_rgb(0_0_0/0.9)] sm:-translate-y-1'
const CARD_OFF = 'bg-stand/70 shadow-[inset_0_0_0_1px_var(--rail)]'

export function Journey() {
  const [ref, seen] = useInViewOnce<HTMLDivElement>()
  const calm = useReducedMotion()
  const [beat, setBeat] = useState(0)

  // The loop runs once the section has been reached, so the visitor arrives
  // mid-story rather than watching it play to an empty screen.
  useEffect(() => {
    if (!seen || calm) return
    const id = setInterval(() => setBeat((current) => (current + 1) % 4), BEAT_MS)
    return () => clearInterval(id)
  }, [seen, calm])

  // Calm motion shows the finished state of every card instead of a loop.
  const step = calm ? 2 : STEP_OF_BEAT[beat]
  const scanning = !calm && beat === 0
  const settled = calm || beat === 3

  return (
    <section ref={ref} className="bg-night-alt px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div className="mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95]">Nuo kainos iki statymo</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-5 max-w-[62ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-haze">
            Skenuojam maždaug kas 30 minučių. Tikro laiko nežadam: jei kaina pasikeitė, signalas pažymimas kaip užsidaręs.
          </p>
        </Reveal>

        <ol className="mt-[clamp(40px,5vw,72px)] grid gap-5 lg:grid-cols-3">
          <Step index={0} title="Skenuojam kainas" active={step === 0} beat={beat}
            blurb="Trys kontoros prieš Pinnacle kainą be maržos, visose rungtynėse, kurias jos pačios siūlo.">
            <div className="relative mt-auto grid gap-2 overflow-hidden rounded-[14px] bg-night p-3">
              {scanning && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-10 animate-[kr-scan_1.7s_cubic-bezier(.45,0,.55,1)_infinite] bg-[linear-gradient(180deg,transparent,rgb(91_229_132/0.18),transparent)]"
                />
              )}
              <p className="truncate text-[0.8125rem] text-haze">
                {scan.market}: {scan.prices[0].selection}
              </p>
              {rows.map((price) => {
                const odds = scanning ? price.odds + (DRIFT[price.book] ?? 0) : price.odds
                const beats = odds > scan.fairOdds
                return (
                  <div key={price.book} className="flex items-center justify-between gap-2.5 text-[0.875rem]">
                    <span className="text-haze">{price.book}</span>
                    <span className="flex items-center gap-2">
                      {beats && !scanning && (
                        <span className="kr-pop rounded-full bg-floodlight/15 px-2 py-0.5 text-[0.75rem] font-semibold text-floodlight tnum">
                          {formatEdge(edgeOf(odds, scan.fairOdds))}
                        </span>
                      )}
                      <span className={`font-semibold tnum ${beats ? 'text-floodlight' : 'text-chalk'}`}>
                        <NumberFlow value={odds} locales="lt-LT" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                      </span>
                    </span>
                  </div>
                )
              })}
              <div className="flex justify-between gap-2.5 border-t border-rail pt-2 text-[0.875rem]">
                <span className="text-haze">Tikroji kaina</span>
                <span className="text-haze tnum">{formatOdds(scan.fairOdds)}</span>
              </div>
            </div>
          </Step>

          <Step index={1} title="Signalas į Telegram" active={step === 1} beat={beat}
            blurb="Rungtynės, kontora, koeficientas, vertė ir suma. Pavadinimas toks, kokį rašo ta kontora.">
            <div className="mt-auto grid gap-2">
              <div className="rounded-[14px] bg-night px-3.5 py-3 text-[0.875rem] text-haze transition-opacity duration-500" style={{ opacity: step === 1 ? 0.55 : 1 }}>
                {previous.event}, {previous.book} {formatOdds(previous.odds)}
              </div>
              {step === 0 ? (
                <div aria-hidden className="flex h-11 items-center gap-[5px] px-1.5">
                  {[0, 0.16, 0.32].map((delay) => (
                    <span
                      key={delay}
                      className="size-[6px] animate-[kr-dots_1.3s_ease-in-out_infinite] rounded-full bg-rail-strong"
                      style={{ animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="kr-row-drop rounded-[14px] bg-stand-hover p-3.5 shadow-[inset_0_0_0_1px_var(--rail-strong)]">
                  <p className="text-[0.875rem]">{alertPrice.event}</p>
                  <p className="mt-1 text-[0.8125rem] text-haze">
                    {alert.market}: {alertPrice.selection}
                  </p>
                  <div className="mt-2.5 flex items-baseline justify-between gap-2.5">
                    <span className="font-display text-[1.25rem] font-bold tnum">
                      {alertPrice.book} {formatOdds(alertPrice.odds)}
                    </span>
                    <span className="text-[0.9375rem] font-semibold text-floodlight tnum">{formatEdge(alertEdge)}</span>
                  </div>
                  {step > 1 && (
                    <p className="kr-fade mt-2 flex items-center gap-1.5 text-[0.8125rem] text-haze">
                      <Check className="size-3.5 text-floodlight" aria-hidden /> Pristatyta
                    </p>
                  )}
                </div>
              )}
            </div>
          </Step>

          <Step index={2} title="Pastatai ir sekam" active={step === 2} beat={beat}
            blurb="Statymas įrašomas su tavo kaina. Rezultatą ir uždarymo kainą užpildom automatiškai.">
            <div className="mt-auto grid gap-2.5 rounded-[14px] bg-night p-3.5 text-[0.875rem]">
              <Line label="Suma">
                <Money value={step === 2 ? STAKE : 0} />
              </Line>
              <Line label={settled ? 'Išmokėta' : 'Galimas laimėjimas'}>
                <Money value={step === 2 ? PAYOUT : 0} />
              </Line>
              <div className="h-px bg-rail" />
              <Line label="Būsena">
                {settled ? (
                  <span className="kr-pop rounded-full bg-floodlight px-2.5 py-1 text-[0.8125rem] font-semibold text-night">Laimėta</span>
                ) : (
                  <span className="rounded-full bg-rail px-2.5 py-1 text-[0.8125rem] font-medium text-chalk">Laukia</span>
                )}
              </Line>
              <Line label="CLV">
                <span className="font-semibold text-floodlight tnum">
                  <NumberFlow
                    value={step === 2 ? CLV : 0}
                    locales="lt-LT"
                    format={{ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }}
                  />
                </span>
              </Line>
              <p className="min-h-[1.25rem] text-[0.8125rem] text-haze">
                {settled ? <span className="kr-fade">Pelnas {formatEuro(PROFIT, 2)} · rezultatas įrašytas automatiškai</span> : null}
              </p>
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
            <span
              key={beat}
              className="block h-full origin-left bg-floodlight"
              style={{ animation: `kr-fill ${BEAT_MS}ms linear forwards` }}
            />
          )}
        </span>
        <p className={`font-display text-[0.9375rem] font-bold transition-colors duration-500 ${active ? 'text-floodlight' : 'text-haze'}`}>
          0{index + 1}
        </p>
        <h3 className="mt-2.5 text-[clamp(1.375rem,2vw,1.75rem)] tracking-[-0.02em]">{title}</h3>
        <p className="mt-2.5 mb-5 text-[0.9375rem] text-haze">{blurb}</p>
        {children}
      </Reveal>
    </li>
  )
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2.5 text-haze">
      <span>{label}</span>
      {children}
    </div>
  )
}

function Money({ value }: { value: number }) {
  return (
    <span className="font-semibold text-chalk tnum">
      <NumberFlow value={value} locales="lt-LT" format={{ style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }} />
    </span>
  )
}
