import { PauseCircle } from 'lucide-react'
import Link from 'next/link'

/** What /signalai shows during the member's own break: no signals, a way to the journal. */
export function PausedBoard({ until }: { until: string }) {
  const end = new Date(until).toLocaleString('lt-LT', {
    timeZone: 'Europe/Vilnius',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <main className="mx-auto max-w-xl px-5 pt-16 pb-24 text-center sm:px-8">
      <PauseCircle className="mx-auto size-10 text-floodlight" aria-hidden />
      <h1 className="mt-5 text-[2.2rem]">Pertrauka iki {end}</h1>
      <p className="mt-4 text-haze">
        Pats pasirinkai padaryti pertrauką, todėl iki tol signalų nerodom nei čia, nei Telegram. Anksčiau jos nutraukti
        negalima.
      </p>
      <p className="mt-6">
        <Link href="/statymai" className="text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk">
          Statymų žurnalas
        </Link>{' '}
        lieka pasiekiamas.
      </p>
      <p className="mt-8 text-[0.9rem] text-haze-dim">
        Jei sunku, kalbėk: „Vilties linija“ 116 123 veikia visą parą. Apriboti sau galimybę lošti visose Lietuvos
        bendrovėse gali per Lošimų priežiūros tarnybą (lpt.lrv.lt).
      </p>
    </main>
  )
}
