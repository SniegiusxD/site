'use client'

import { Check, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { FREE_MAX_EDGE, FREE_MAX_ODDS } from '@/lib/free-tier'
import { formatEdge, formatOdds } from '@/lib/format-lt'
import type { Access } from '@/lib/subscription'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'

/**
 * The money conversation is where this belongs, not only in the footer. Nothing
 * here is a growth message: a member deciding to pay should read the limits of
 * what they are buying at the moment they decide.
 */
function ResponsibleUse() {
  return (
    <section aria-label="Atsakingas lošimas" className="mt-10 rounded-2xl bg-night-deep/60 p-5 text-[0.9rem] leading-normal text-haze">
      <p className="font-medium text-chalk">Prieš mokant, verta žinoti</p>
      <ul className="mt-2.5 grid gap-1.5">
        <li>Prenumerata perka kainų informaciją, o ne pelną. Vertė atsiperka per šimtus statymų ir gali neatsipirkti.</li>
        <li>Statymams skirk tik tiek, kiek gali prarasti. Siūloma suma skaičiuojama nuo tavo banko ir niekada neviršija tavo kontoros limito.</li>
        <li>Lietuvos kontoros karpo laiminčias paskyras: gali gauti mažesnį limitą arba prastesnį koeficientą.</li>
        <li>Tik nuo 21 metų. Dalyvavimas azartiniuose lošimuose gali sukelti priklausomybę.</li>
      </ul>
      <p className="mt-3">
        Apriboti sau galimybę lošti gali per{' '}
        <a
          href="https://lpt.lrv.lt"
          rel="noopener"
          className="text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk"
        >
          Lošimų priežiūros tarnybą
        </a>
        . Prenumeratą gali nutraukti bet kada — prieiga lieka iki apmokėto laikotarpio pabaigos.
      </p>
    </section>
  )
}

// Only what paying adds; the free card lists the rest.
const FULL = [
  'Visi signalai, be vertės ir koeficiento ribų',
  'Kainų judėjimas: kurių signalų kaina krenta ar kyla',
  'Kiekvieno signalo kainų istorija',
  'Telegram pranešimai su suma pagal tavo banką',
]

export function UnlockView({ access, billing }: { access: Access; billing: boolean }) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)
  const [paying, setPaying] = useState(false)

  async function subscribe() {
    setPaying(true)
    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST' })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.url) throw new Error(body?.error ?? 'Nepavyko atidaryti apmokėjimo.')
      window.location.assign(body.url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nepavyko atidaryti apmokėjimo.')
      setPaying(false)
    }
  }

  async function start() {
    setStarting(true)
    try {
      const response = await fetch('/api/trial', { method: 'POST' })
      if (!response.ok) throw new Error(String(response.status))
      // The board plays the unlock itself; no toast on top of it.
      router.push('/signalai?atrakinta=1')
      router.refresh()
    } catch {
      toast.error('Nepavyko pradėti bandymo. Bandyk dar kartą.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[46rem] px-5 py-14 sm:px-8">
      <h1 className="text-[2.6rem] leading-[1.02] sm:text-[3.2rem]">
        {access.state === 'expired' ? `Tavo ${TRIAL_DAYS} dienos baigėsi` : 'Atrakink visus signalus'}
      </h1>
      <p className="mt-4 text-haze">
        Nemokama paskyra lieka tavo: signalai iki {formatEdge(FREE_MAX_EDGE)} vertės ir iki {formatOdds(FREE_MAX_ODDS)} koeficiento,
        bankrollas ir statymų istorija. Prenumerata atrakina likusius.
      </p>

      {/* Phones see the paid card and its button first; wider screens keep the
          familiar free-left, paid-right order. */}
      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <section className="order-2 rounded-3xl bg-stand/60 p-6 hairline sm:order-1">
          <p className="flex items-center gap-2 text-[0.95rem] text-haze">
            <Lock className="size-4" aria-hidden />
            Nemokamai
          </p>
          <p className="mt-3 font-display text-[2.2rem] font-extrabold">0 €</p>
          <ul className="mt-5 space-y-2 text-[0.95rem] text-haze">
            <li>Signalai iki {formatEdge(FREE_MAX_EDGE)} vertės</li>
            <li>Koeficientai iki {formatOdds(FREE_MAX_ODDS)}</li>
            <li>Bankrollas ir statymų sekimas</li>
          </ul>
        </section>

        <section className="lift order-1 rounded-3xl bg-stand p-6 sm:order-2">
          <p className="text-[0.95rem] text-haze">Viskas</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-[2.2rem] font-extrabold tnum">{PRICE_EUR_PER_MONTH} €</span>
            <span className="text-haze">/ mėn.</span>
          </p>
          <p className="mt-5 text-[0.9rem] text-haze">Viskas, kas nemokamai, ir:</p>
          <ul className="mt-2.5 space-y-2.5 text-[0.95rem]">
            {FULL.map((item) => (
              <li key={item} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-pitch" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          {access.canStartTrial ? (
            <>
              <button
                type="button"
                onClick={start}
                disabled={starting}
                className="mt-6 min-h-12 w-full rounded-xl px-4 py-2.5 bg-floodlight font-semibold text-night transition-colors hover:bg-pitch disabled:opacity-70"
              >
                {starting ? 'Atrakinam…' : `Išbandyti ${TRIAL_DAYS} dienas nemokamai`}
              </button>
              <p className="mt-2.5 text-center text-[0.9rem] text-haze">Kortelės nereikia. Pasibaigus lieki nemokamoje paskyroje.</p>
            </>
          ) : billing ? (
            <>
              <button
                type="button"
                onClick={subscribe}
                disabled={paying}
                className="mt-6 min-h-12 w-full rounded-xl px-4 py-2.5 bg-floodlight font-semibold text-night transition-colors hover:bg-pitch disabled:opacity-70"
              >
                {paying ? 'Atidarom apmokėjimą…' : `Prenumeruoti už ${PRICE_EUR_PER_MONTH} € per mėnesį`}
              </button>
              <p className="mt-2.5 text-center text-[0.9rem] text-haze">
                Apmokėjimas per Stripe. Atšaukti gali bet kada — prieiga lieka iki apmokėto laikotarpio pabaigos.
              </p>
            </>
          ) : (
            <>
              <button type="button" disabled className="mt-6 min-h-12 w-full cursor-not-allowed rounded-xl px-4 py-2.5 bg-floodlight/60 font-semibold text-night">
                Mokėjimai įjungiami netrukus
              </button>
              <p className="mt-2.5 text-center text-[0.9rem] text-haze">Kol kas gali naudotis nemokama paskyra.</p>
            </>
          )}
        </section>
      </div>

      {/* Someone still in their free days can pay now and keep them: the
          subscription starts when the trial would have ended. */}
      {billing && access.state === 'trial' && (
        <button
          type="button"
          onClick={subscribe}
          disabled={paying}
          className="mt-3 h-11 w-full rounded-xl font-medium text-chalk hairline transition-colors hover:bg-stand disabled:opacity-70"
        >
          Prenumeruoti dabar — likusios nemokamos dienos išlieka
        </button>
      )}

      <ResponsibleUse />
    </main>
  )
}
