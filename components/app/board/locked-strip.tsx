'use client'

import { Lock } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { FREE_MAX_EDGE, FREE_MAX_ODDS } from '@/lib/free-tier'
import { formatEdge, formatOdds, ltPlural } from '@/lib/format-lt'
import type { LockedSignal } from '@/lib/live-signals'
import { sportName } from '@/lib/sports-lt'
import type { Access } from '@/lib/subscription'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'

/**
 * Free accounts: what a subscription would open. Only the value, the odds, the
 * sport and the kickoff are here — the match, the market and the book never
 * reach the browser, so nothing in this strip can be turned into a bet.
 */
export function LockedStrip({ locked, access, onUnlocked }: { locked: LockedSignal[]; access: Access; onUnlocked: () => void }) {
  const [starting, setStarting] = useState(false)
  const shown = locked.slice(0, 4)
  const rest = locked.length - shown.length

  async function startTrial() {
    setStarting(true)
    try {
      const response = await fetch('/api/trial', { method: 'POST' })
      if (!response.ok) throw new Error(String(response.status))
      onUnlocked()
    } catch {
      toast.error('Nepavyko pradėti bandymo. Bandyk dar kartą.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <section aria-label="Užrakinti signalai" className="border-b border-rail bg-stand/40 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-[1.05rem] font-semibold">
          <Lock className="size-4 text-haze" aria-hidden />
          Užrakinta
        </h2>
        <p className="text-[0.9rem] text-haze tnum">
          {locked.length} {ltPlural(locked.length, 'signalas', 'signalai', 'signalų')}
        </p>
      </div>
      <p className="mt-1.5 text-[0.9rem] text-haze">
        Nemokamai matai signalus iki {formatEdge(FREE_MAX_EDGE)} vertės ir iki {formatOdds(FREE_MAX_ODDS)} koeficiento. Didesni laukia čia.
      </p>

      <ul className="mt-3.5 space-y-1.5">
        {shown.map((signal) => (
          <li key={signal.id} className="flex items-center gap-3 rounded-xl bg-night px-3 py-2.5">
            <span className="min-w-0 flex-1" aria-hidden>
              <span className="block h-3 w-[70%] rounded-full bg-rail/80 blur-[2px]" />
              <span className="mt-1.5 block h-2.5 w-[45%] rounded-full bg-rail/50 blur-[2px]" />
            </span>
            <span className="sr-only">{sportName(signal.sport)}, užrakintas signalas</span>
            <span className="shrink-0 text-right">
              <span className="block font-semibold text-floodlight tnum">{formatEdge(signal.bestEdge)}</span>
              <span className="block text-[0.8rem] text-haze tnum">koef. {formatOdds(signal.bestOdds)}</span>
            </span>
          </li>
        ))}
      </ul>
      {rest > 0 && <p className="mt-2 text-[0.875rem] text-haze tnum">ir dar {rest}</p>}

      {access.canStartTrial ? (
        <button
          type="button"
          onClick={startTrial}
          disabled={starting}
          className="kr-press mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-floodlight font-semibold text-night transition-colors hover:bg-pitch disabled:opacity-70"
        >
          {starting ? 'Atrakinam…' : `Atrakinti ${TRIAL_DAYS} dienoms nemokamai`}
        </button>
      ) : (
        <Link
          href="/atrakinti"
          className="kr-press mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-floodlight font-semibold text-night transition-colors hover:bg-pitch"
        >
          Atrakinti už {PRICE_EUR_PER_MONTH} € per mėnesį
        </Link>
      )}
      <p className="mt-2 text-center text-[0.85rem] text-haze">
        {access.canStartTrial ? 'Kortelės nereikia.' : 'Atšaukti gali bet kada.'}
      </p>
    </section>
  )
}
