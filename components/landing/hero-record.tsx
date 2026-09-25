'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatOdds } from '@/lib/format-lt'
import type { HeroRecordSignal } from '@/lib/hero-record'
import { DURATION, EASE } from '@/lib/motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'

const CYCLE_MS = 5600
/** When each step lights up after a signal arrives: price, then close, then CLV. */
const STEP_MS = [0, 800, 1600]
const CLV_FLOW = { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' } as const

/**
 * The landing hero, from the public record: real signals whose matches have
 * already started, one at a time. For each, the price we found, the close it
 * was measured against, and the CLV between them light up in order, then the
 * next one comes. No bookmaker is named (public-page rule, ALĮ 10 str. 19 d.).
 *
 * Fixed height and fixed slots, so nothing around it moves when the text does.
 * Calm mode shows each signal complete and does not advance on its own.
 */
export function HeroRecord({ signals }: { signals: HeroRecordSignal[] }) {
  const calm = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState(0)
  const [held, setHeld] = useState(false)
  const signal = signals[index % signals.length]
  const shown = calm ? 2 : step

  useEffect(() => {
    if (calm) return
    const timers = STEP_MS.map((at, next) => setTimeout(() => setStep(next), at))
    return () => timers.forEach(clearTimeout)
  }, [calm, index])

  useEffect(() => {
    if (calm || held || signals.length < 2) return
    const id = setTimeout(() => {
      setStep(0)
      setIndex((current) => (current + 1) % signals.length)
    }, CYCLE_MS)
    return () => clearTimeout(id)
  }, [calm, held, index, signals.length])

  const pick = (next: number) => {
    setStep(0)
    setIndex(next)
  }

  // Text stays at full contrast; the step being told gets a ring that moves on.
  const cell = (at: number) =>
    `rounded-xl p-3 transition-shadow duration-300 sm:p-4 ${shown === at ? 'shadow-[inset_0_0_0_1.5px_var(--chalk)]' : 'shadow-[inset_0_0_0_1px_var(--rail)]'}`

  return (
    <div
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      className="overflow-hidden rounded-[22px] bg-stand shadow-[inset_0_0_0_1px_var(--rail-strong),0_40px_90px_-50px_rgb(0_0_0/0.9)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-rail px-5 py-4">
        <p className="font-display text-[1.125rem] font-bold">Signalų įrašas</p>
        <p className="text-[0.875rem] text-haze">jau prasidėjusios rungtynės</p>
      </div>

      <div className="relative h-[13.5rem] px-5 py-5" aria-live="off">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={signal.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: DURATION.settle, ease: EASE }}
          >
            <p className="truncate text-[0.875rem] text-haze">{signal.sport}</p>
            <p className="mt-0.5 truncate text-[1.0625rem] font-medium">{signal.event}</p>
            <p className="truncate text-[0.9375rem] text-chalk/85">{signal.pick}</p>

            <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1.5 sm:gap-2">
              <div className={`${cell(0)} bg-night/60`}>
                <p className="text-[0.75rem] text-haze sm:text-[0.8125rem]">Rasta kaina</p>
                <p className="mt-1 font-display text-[1.375rem] leading-none font-bold tnum">{formatOdds(signal.odds)}</p>
              </div>
              <ArrowRight aria-hidden className={`size-4 text-haze-dim transition-opacity duration-300 ${shown >= 1 ? 'opacity-100' : 'opacity-30'}`} />
              <div className={`${cell(1)} bg-night/60`}>
                <p className="text-[0.75rem] text-haze sm:text-[0.8125rem]">Uždarymas</p>
                <p className="mt-1 font-display text-[1.375rem] leading-none font-bold tnum">{formatOdds(signal.closeOdds)}</p>
              </div>
              <ArrowRight aria-hidden className={`size-4 text-haze-dim transition-opacity duration-300 ${shown >= 2 ? 'opacity-100' : 'opacity-30'}`} />
              <div className={`${cell(2)} ${signal.clv > 0 ? 'bg-floodlight-soft' : 'bg-night/60'}`}>
                <p className={`text-[0.75rem] sm:text-[0.8125rem] ${signal.clv > 0 ? 'text-floodlight' : 'text-haze'}`}>CLV</p>
                <p className={`mt-1 font-display text-[1.375rem] leading-none font-bold tnum ${signal.clv > 0 ? 'text-floodlight' : 'text-chalk'}`}>
                  <NumberFlow value={shown >= 2 ? signal.clv : 0} locales="lt-LT" format={CLV_FLOW} animated={!calm} />
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {signals.length > 1 && (
          <div className="absolute inset-x-5 bottom-4 flex items-center gap-1.5">
            {signals.map((entry, dot) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => pick(dot)}
                aria-label={`Rodyti signalą ${dot + 1} iš ${signals.length}`}
                aria-current={dot === index ? 'true' : undefined}
                className="grid h-6 w-6 place-items-center"
              >
                <span className={`block h-1.5 rounded-full transition-[background-color] ${dot === index ? 'w-5 bg-chalk' : 'w-1.5 bg-rail-strong'}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="border-t border-rail px-5 py-3 text-[0.8125rem] text-haze-dim">
        CLV — kiek mūsų rasta kaina buvo geresnė už uždarymo kainą. Visi signalai, ir nepavykę:{' '}
        <Link href="/rezultatai" className="text-chalk underline underline-offset-4">
          rezultatai
        </Link>
        .
      </p>
    </div>
  )
}
