'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CreditCard, Loader2, RotateCcw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CANCEL_REASONS } from '@/lib/billing/cancel-reasons'
import type { BillingState } from '@/lib/billing/store'
import { kickoffLabel } from '@/lib/live-view'
import { PRICE_EUR_PER_MONTH } from '@/lib/subscription'
import { useApi } from '@/lib/use-api'
import { LoadError } from './load-error'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { EASE } from '@/lib/motion'


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
  // The status as the server has it, until a cancel or resume here returns the new billing.
  const { data: loaded, error: loadError, loading, reload: load } = useApi<Status>('/api/billing/status')
  const [changed, setStatus] = useState<Status | null>(null)
  const status = changed ?? loaded
  // Back from Checkout or the portal: the card says it is confirming from the first frame.
  const params = useSearchParams()
  const from = params.get('billing')
  const returning = (from === 'success' && Boolean(params.get('session_id'))) || from === 'portal'
  const [busy, setBusy] = useState<'checkout' | 'portal' | 'sync' | 'cancel' | 'resume' | null>(returning ? 'sync' : null)
  const [leaving, setLeaving] = useState(false)
  const [reason, setReason] = useState<string | null>(null)
  const returned = useRef(false)
  const reduced = useReducedMotion()

  // Back from Checkout or the portal: confirm once, then drop the parameters.
  useEffect(() => {
    if (returned.current) return
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const from = params.get('billing')
    if (!(from === 'success' && sessionId) && from !== 'portal') return
    returned.current = true
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
        setStatus(null)
        load()
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

  async function change(action: 'cancel' | 'resume') {
    setBusy(action)
    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) throw new Error(body?.error ?? 'Nepavyko.')
      setStatus((current) => {
        const base = current ?? loaded
        return base ? { ...base, billing: body.billing } : base
      })
      setLeaving(false)
      setReason(null)
      toast.success(action === 'cancel' ? 'Prenumerata atšaukta. Daugiau mokėjimų nebus.' : 'Prenumerata vėl aktyvi.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepavyko.')
    } finally {
      setBusy(null)
    }
  }

  if (!status && loadError && !loading) return <LoadError error={loadError} what="prenumeratos būsenos" onRetry={load} />
  if (!status) {
    return (
      <p role="status" className="text-haze">
        Įkeliama…
      </p>
    )
  }
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
          Nepavyko nuskaityti mokėjimo nuo {dateOf(billing.paymentFailedAt)} Prieiga kol kas veikia — atnaujink kortelę, kad
          nenutrūktų.
        </p>
      )}

      <p className="text-[1.05rem]">
        {busy === 'sync'
          ? 'Tvirtinam apmokėjimą…'
          : paying
            ? `Prenumerata aktyvi, ${PRICE_EUR_PER_MONTH} € per mėnesį. Kitas mokėjimas ${dateOf(billing.currentPeriodEnd)}`
            : ending
              ? `Prenumerata atšaukta. Viskas veikia iki ${dateOf(billing.currentPeriodEnd)}, paskui lieki nemokamoje paskyroje.`
              : `Nemokamas planas. Visi signalai — ${PRICE_EUR_PER_MONTH} € per mėnesį, atšaukti gali bet kada.`}
      </p>

      <div className="flex flex-wrap gap-2.5">
        {ending && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => change('resume')}
            className={`${button} bg-floodlight text-night hover:bg-pitch`}
          >
            {busy === 'resume' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
            Tęsti prenumeratą
          </button>
        )}
        {paying || ending ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => go('/api/billing/portal', 'portal')}
            className={`${button} bg-rail text-chalk hover:bg-rail-strong`}
          >
            {busy === 'portal' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CreditCard className="size-4" aria-hidden />}
            {billing.paymentFailedAt ? 'Atnaujinti kortelę' : 'Kortelė ir sąskaitos'}
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
        {paying && !leaving && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setLeaving(true)}
            className={`${button} font-medium text-haze hover:bg-stand hover:text-chalk`}
          >
            Atšaukti prenumeratą
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
      {paying && leaving && (
        <motion.div
          key="leave"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="rounded-2xl bg-night/60 p-5 hairline"
        >
          <p className="font-medium">Atšaukti prenumeratą?</p>
          <ul className="mt-2 grid gap-1 text-[0.95rem] text-haze">
            <li>Daugiau mokėjimų nebus. Visi signalai veiks iki {dateOf(billing.currentPeriodEnd)}, nes už šį laiką jau sumokėta.</li>
            <li>Paskui lieki nemokamoje paskyroje: statymų istorija, bankrollas ir nustatymai niekur nedings.</li>
            <li>Iki {dateOf(billing.currentPeriodEnd)} persigalvoti gali vienu paspaudimu.</li>
          </ul>
          <fieldset className="mt-4">
            <legend className="text-[0.9rem] text-haze">Kodėl išeini? Nebūtina, bet padeda.</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CANCEL_REASONS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={reason === entry.key}
                  onClick={() => setReason(reason === entry.key ? null : entry.key)}
                  className={`min-h-10 rounded-full px-3.5 text-[0.9rem] font-medium transition-colors ${
                    reason === entry.key ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button type="button" disabled={busy !== null} onClick={() => change('cancel')} className={`${button} bg-brick text-night`}>
              {busy === 'cancel' && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Atšaukti prenumeratą
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setLeaving(false)
                setReason(null)
              }}
              className={`${button} font-medium text-haze hover:text-chalk`}
            >
              Palikti kaip yra
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
