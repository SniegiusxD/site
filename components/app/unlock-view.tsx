'use client'

import { Check, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { FREE_MAX_EDGE, FREE_MAX_ODDS } from '@/lib/free-tier'
import { formatEdge, formatOdds } from '@/lib/format-lt'
import type { Access } from '@/lib/subscription'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'

const FULL = [
  'Visi signalai, be vertės ir koeficiento ribų',
  'Visų kontorų kainos ir tikroji kaina prie kiekvieno',
  'Telegram pranešimai su suma pagal tavo banką',
  'Statymų sekimas, rezultatai ir CLV',
]

export function UnlockView({ access }: { access: Access }) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)

  async function start() {
    setStarting(true)
    try {
      const response = await fetch('/api/trial', { method: 'POST' })
      if (!response.ok) throw new Error(String(response.status))
      toast.success(`Atrakinta ${TRIAL_DAYS} dienoms`)
      router.push('/signalai')
      router.refresh()
    } catch {
      toast.error('Nepavyko pradėti bandymo. Bandyk dar kartą.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[38rem] px-5 py-14 sm:px-8">
      <h1 className="text-[2.6rem] leading-[1.02] sm:text-[3.2rem]">
        {access.state === 'expired' ? `Tavo ${TRIAL_DAYS} dienos baigėsi` : 'Atrakink visus signalus'}
      </h1>
      <p className="mt-4 text-haze">
        Nemokama paskyra lieka tavo: signalai iki {formatEdge(FREE_MAX_EDGE)} vertės ir iki {formatOdds(FREE_MAX_ODDS)} koeficiento,
        bankrollas ir statymų istorija. Prenumerata atrakina likusius.
      </p>

      <div className="mt-9 grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl bg-stand/60 p-6 hairline">
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

        <section className="lift rounded-3xl bg-stand p-6">
          <p className="text-[0.95rem] text-haze">Viskas</p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-[2.2rem] font-extrabold tnum">{PRICE_EUR_PER_MONTH} €</span>
            <span className="text-haze">/ mėn.</span>
          </p>
          <ul className="mt-5 space-y-2.5 text-[0.95rem]">
            {FULL.map((item) => (
              <li key={item} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-pitch" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {access.canStartTrial ? (
        <>
          <button
            type="button"
            onClick={start}
            disabled={starting}
            className="mt-8 h-12 w-full rounded-xl bg-floodlight font-semibold text-night transition-colors hover:bg-pitch disabled:opacity-70"
          >
            {starting ? 'Atrakinam…' : `Išbandyti ${TRIAL_DAYS} dienas nemokamai`}
          </button>
          <p className="mt-2.5 text-center text-[0.9rem] text-haze">Kortelės nereikia. Pasibaigus lieki nemokamoje paskyroje.</p>
        </>
      ) : (
        <>
          <button type="button" disabled className="mt-8 h-12 w-full cursor-not-allowed rounded-xl bg-floodlight/60 font-semibold text-night">
            Mokėjimai įjungiami netrukus
          </button>
          <p className="mt-2.5 text-center text-[0.9rem] text-haze">Kol kas gali naudotis nemokama paskyra.</p>
        </>
      )}
    </main>
  )
}
