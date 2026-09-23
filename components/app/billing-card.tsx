'use client'

import { AlertTriangle, CreditCard, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { BillingState } from '@/lib/billing/store'
import { kickoffLabel } from '@/lib/live-view'
import { PRICE_EUR_PER_MONTH } from '@/lib/subscription'

type Status = { enabled: boolean; testMode: boolean; billing: BillingState }

const dateOf = (iso: string | null) => (iso ? kickoffLabel(iso).replace(/\s\d{2}:\d{2}$/, '') : '')

/**
 * The member's subscription, and the one action that fits it: pay, manage,
 * resume, or fix a card. Also finishes a checkout: when Stripe sends the member
 * back with a session id, the subscription is confirmed here straight away
 * instead of waiting for the webhook.
 */
export function BillingCard() {
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState<'checkout' | 'portal' | 'sync' | null>(null)
  const returned = useRef(false)

  const load = useCallback(async () => {
    const response = await fetch('/api/billing/status', { cache: 'no-store' })
    if (response.ok) setStatus(await response.json())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Back from Checkout or the portal: confirm once, then drop the parameters.
  useEffect(() => {
    if (returned.current) return
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const from = params.get('billing')
    if (!(from === 'success' && sessionId) && from !== 'portal') return
    returned.current = true
    setBusy('sync')
    fetch('/api/billing/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(from === 'success' ? { sessionId } : {}),
    })
      .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
      .then(({ ok, body }) => {
        if (!ok) throw new Error(body?.error)
        if (from === 'portal') toast('Prenumeratos būsena atnaujinta.')
        else if (body.pending) toast('Apmokėjimas dar tvirtinamas — prenumerata įsijungs per kelias minutes.')
        else toast.success('Prenumerata aktyvi. Visi signalai atrakinti.')
        router.replace('/profilis#prenumerata', { scroll: false })
        router.refresh()
        return load()
      })
      .catch((error) => toast.error(error?.message || 'Nepavyko patikrinti apmokėjimo.'))
      .finally(() => setBusy(null))
  }, [load, router])

  async function go(path: '/api/billing/checkout' | '/api/billing/portal', kind: 'checkout' | 'portal') {
    setBusy(kind)
    try {
      const response = await fetch(path, { method: 'POST' })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.url) throw new Error(body?.error ?? 'Nepavyko.')
      window.location.assign(body.url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepavyko.')
      setBusy(null)
    }
  }

  if (!status) return <p className="text-haze">Įkeliama…</p>
  if (!status.enabled) return <p className="text-haze">Mokėjimai įjungiami netrukus. Kol kas gali naudotis nemokama paskyra.</p>

  const { billing } = status
  const paying = billing.status === 'active'
  const ending = billing.status === 'canceled' && billing.currentPeriodEnd && new Date(billing.currentPeriodEnd) > new Date()
  const button =
    'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold transition-colors disabled:opacity-60'

  return (
    <div className="grid gap-4">
      {status.testMode && (
        <p className="rounded-xl bg-rail px-3.5 py-2.5 text-[0.9rem] text-haze">
          Bandomasis režimas: tikri pinigai nenuskaitomi. Kortelė 4242 4242 4242 4242 su bet kokia būsima data.
        </p>
      )}

      {billing.paymentFailedAt && (
        <p role="alert" className="flex gap-2.5 rounded-xl bg-brick-soft px-3.5 py-3 text-brick">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          Nepavyko nuskaityti mokėjimo nuo {dateOf(billing.paymentFailedAt)}. Prieiga kol kas veikia — atnaujink kortelę, kad
          nenutrūktų.
        </p>
      )}

      <p className="text-[1.05rem]">
        {busy === 'sync'
          ? 'Tvirtinam apmokėjimą…'
          : paying
            ? `Prenumerata aktyvi, ${PRICE_EUR_PER_MONTH} € per mėnesį. Kitas mokėjimas ${dateOf(billing.currentPeriodEnd)}.`
            : ending
              ? `Prenumerata atšaukta. Viskas veikia iki ${dateOf(billing.currentPeriodEnd)}, paskui lieki nemokamoje paskyroje.`
              : `Nemokamas planas. Visi signalai — ${PRICE_EUR_PER_MONTH} € per mėnesį, atšaukti gali bet kada.`}
      </p>

      <div className="flex flex-wrap gap-2.5">
        {paying || ending ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => go('/api/billing/portal', 'portal')}
            className={`${button} bg-rail text-chalk hover:bg-rail-strong`}
          >
            {busy === 'portal' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
            {billing.paymentFailedAt ? 'Atnaujinti kortelę' : ending ? 'Atnaujinti prenumeratą' : 'Tvarkyti prenumeratą ir sąskaitas'}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => go('/api/billing/checkout', 'checkout')}
            className={`${button} bg-floodlight text-night hover:bg-pitch`}
          >
            {busy === 'checkout' && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Prenumeruoti
          </button>
        )}
      </div>
    </div>
  )
}
