'use client'

import { Check, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { BoardBet } from '@/lib/exposure'
import { useAccount } from './account-provider'

const DISMISS_KEY = 'first-steps-dismissed'

/**
 * What a new member has not done yet, from what actually happened rather than a
 * tour: a recorded bet, a settled result, Telegram connected. It disappears on
 * its own when the list is complete, so it never becomes furniture.
 */
export function FirstSteps({ bets }: { bets: BoardBet[] }) {
  const { account } = useAccount()
  // Read once, lazily: the server renders nothing for this component anyway,
  // and an effect that sets state on mount is a cascading render.
  const [dismissed, setDismissed] = useState(true)
  // Unknown means "not connected yet" here: a failed or skipped check must not
  // hide the whole checklist.
  const [telegram, setTelegram] = useState(false)
  const [settled, setSettled] = useState(false)

  useEffect(() => {
    let stored = false
    try {
      stored = window.localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      stored = false
    }
    // Deferred so the read is not a synchronous set inside the effect body.
    const id = window.setTimeout(() => setDismissed(stored), 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    fetch('/api/bets', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => setSettled(Boolean((body?.bets ?? []).some((bet: { profit: number | null }) => bet.profit !== null))))
      .catch(() => setSettled(false))
  }, [])

  useEffect(() => {
    if (!account.access.hasAccess) return
    fetch('/api/telegram', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((state) => setTelegram(Boolean(state?.connected)))
      .catch(() => {
        // Leave it as not connected; the step stays actionable.
      })
  }, [account.access.hasAccess])

  // The board only carries recent bets and no status, so "a result arrived" is
  // asked of the bets endpoint rather than guessed from this list.
  const placed = bets.length > 0
  const steps = [
    { done: true, label: 'Nustatei banką ir kontoras' },
    { done: placed, label: 'Pažymėjai pirmą statymą', href: '/signalai' },
    { done: telegram, label: 'Prijungei Telegram', href: '/profilis#telegram' },
    { done: settled, label: 'Pamatei pirmą rezultatą', href: '/statymai' },
  ]
  const left = steps.filter((step) => !step.done).length

  if (dismissed || left === 0) return null

  return (
    <section aria-label="Pirmi žingsniai" className="border-b border-rail bg-stand/40 px-4 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">Pirmi žingsniai</p>
        <button
          type="button"
          aria-label="Paslėpti pirmus žingsnius"
          onClick={() => {
            setDismissed(true)
            try {
              window.localStorage.setItem(DISMISS_KEY, '1')
            } catch {
              // Hiding then lasts for this visit only.
            }
          }}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-haze-dim hover:bg-rail hover:text-chalk"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <ul className="mt-2.5 grid gap-1.5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center gap-2.5 text-[0.9rem]">
            <span
              aria-hidden
              className={`grid size-5 shrink-0 place-items-center rounded-full ${
                step.done ? 'bg-floodlight text-night' : 'shadow-[inset_0_0_0_1px_var(--rail-strong)]'
              }`}
            >
              {step.done && <Check className="size-3" strokeWidth={3} />}
            </span>
            {step.done || !step.href ? (
              <span className={step.done ? 'text-haze line-through' : ''}>{step.label}</span>
            ) : (
              <Link href={step.href} className="underline decoration-rail-strong underline-offset-4 hover:text-chalk">
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
