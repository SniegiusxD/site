'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import Link from 'next/link'
import { formatEuro, ltPlural } from '@/lib/format-lt'
import { PRICE_EUR_PER_MONTH } from '@/lib/subscription'
import type { TrialRecap as Recap } from '@/lib/trial-recap'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { useApi } from '@/lib/use-api'
import { useStoredState } from '@/lib/use-stored-state'

const EASE = [0.22, 1, 0.36, 1] as const

/** Older visits stored '1'; new ones store true. */
const dismissedFlag = (value: unknown) => (value === 1 || value === true ? true : undefined)
const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatEuro(Math.abs(value), 2)}`

/**
 * Once the 7 free days are over: what the member did with them, from their own
 * bets, beside the offer to keep going. Dismissed once per trial and
 * remembered in this browser; the subscribe path stays on the locked strip.
 */
export function TrialRecap() {
  const reduced = useReducedMotion()
  // A failed request simply shows nothing: the locked strip still offers the way on.
  const { data } = useApi<{ recap: Recap | null }>('/api/trial/recap')
  const recap = data?.recap ?? null
  // Dismissed once per trial, in this browser. Storage blocked: closing still
  // works for this page view.
  const [dismissed, setDismissed] = useStoredState(`kr-trial-recap-${recap?.endedAt ?? 'none'}`, dismissedFlag, false)

  if (!recap || dismissed) return null

  function close() {
    setDismissed(true)
  }

  return (
    <motion.section
      aria-label="Tavo bandymas"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="relative border-b border-rail bg-floodlight-soft/40 px-4 py-5 sm:px-6"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Uždaryti"
        className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-haze hover:bg-stand hover:text-chalk"
      >
        <X className="size-4" aria-hidden />
      </button>
      <h2 className="pr-10 text-[1.25rem] font-semibold">Tavo 7 dienų bandymas baigėsi</h2>
      {recap.bets > 0 ? (
        <>
          <p className="mt-1.5 text-[0.95rem] text-haze">
            Per jį pažymėjai {recap.bets} {ltPlural(recap.bets, 'statymą', 'statymus', 'statymų')} už {formatEuro(recap.staked)}.
          </p>
          <dl className="mt-3.5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-night/70 p-3.5">
              <dt className="text-[0.85rem] text-haze">Tikėtina vertė</dt>
              <dd className="mt-0.5 font-display text-2xl font-bold text-floodlight tnum">{signed(recap.expectedValue)}</dd>
              <dd className="mt-0.5 text-[0.8rem] text-haze-dim">pagal tikrąją kainą statymo metu</dd>
            </div>
            <div className="rounded-xl bg-night/70 p-3.5">
              <dt className="text-[0.85rem] text-haze">Rezultatas</dt>
              <dd className="mt-0.5 font-display text-2xl font-bold tnum">{recap.settled ? signed(recap.profit) : '—'}</dd>
              <dd className="mt-0.5 text-[0.8rem] text-haze-dim">
                {recap.settled ? `${recap.settled} iš ${recap.bets} atsiskaityta` : 'dar neatsiskaityta'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[0.85rem] text-haze">
            Per savaitę rezultatas daugiausia yra atsitiktinumas; vertė parodo, ar kainos buvo geros.
          </p>
        </>
      ) : (
        <p className="mt-1.5 text-[0.95rem] text-haze">
          Per jį nepažymėjai nė vieno statymo. Didesnės vertės signalai toliau atsiranda kasdien — jie žemiau, užrakinti.
        </p>
      )}
      <Link
        href="/atrakinti"
        className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-floodlight px-5 font-semibold text-night transition-transform active:scale-[0.97]"
      >
        Tęsti už {PRICE_EUR_PER_MONTH} € per mėnesį
      </Link>
    </motion.section>
  )
}
