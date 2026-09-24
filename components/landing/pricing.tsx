import { Check, Lock } from 'lucide-react'
import Link from 'next/link'
import { FREE_MAX_EDGE, FREE_MAX_ODDS } from '@/lib/free-tier'
import { formatEdge, formatOdds } from '@/lib/format-lt'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'
import { Reveal } from './motion-primitives'

const FREE = [
  `Signalai iki ${formatEdge(FREE_MAX_EDGE)} vertės`,
  `Koeficientai iki ${formatOdds(FREE_MAX_ODDS)}`,
  'Bankrollas, siūloma suma ir statymų sekimas',
  'Rezultatai ir CLV',
]

// Only what paying adds; the free card above already lists the rest.
const INCLUDED = [
  'Visi signalai, be vertės ir koeficiento ribų',
  'Kainų judėjimas: kurių signalų kaina krenta ar kyla',
  'Kiekvieno signalo kainų istorija',
  'Signalai į Telegram pagal tavo taisykles',
]

export function Pricing() {
  return (
    <section id="kaina" className="scroll-mt-16 bg-night px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div className="mx-auto grid max-w-[80rem] items-center gap-[clamp(32px,5vw,64px)] lg:grid-cols-[1fr_minmax(0,32rem)]">
        <div className="min-w-0">
          <Reveal>
            <h2 className="text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[0.95]">Nemokama paskyra lieka nemokama</h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-5 max-w-[56ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-haze">
              Užsiregistruoji ir iš karto matai tikrus signalus — tuos, kurių vertė iki {formatEdge(FREE_MAX_EDGE)}. Didesni lieka užrakinti,
              kol jų neatrakini. Kortelės nei registracijai, nei {TRIAL_DAYS} dienų bandymui neprašom.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <div className="mt-8 max-w-[30rem] rounded-[18px] bg-stand/60 p-6 hairline">
              <p className="flex items-center gap-2 text-[0.9375rem] text-haze">
                <Lock className="size-4" aria-hidden />
                Nemokamai, be termino
              </p>
              <p className="mt-2.5 font-display text-[2rem] leading-none font-extrabold">0 €</p>
              <ul className="mt-4 grid gap-2 text-[0.9375rem] text-haze">
                {FREE.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        <Reveal variant="board">
          <div className="rounded-[20px] bg-stand p-[clamp(24px,3vw,36px)] shadow-[inset_0_0_0_1px_var(--rail),0_30px_80px_-30px_rgb(0_0_0/0.8)]">
            <span className="inline-block rounded-full bg-floodlight-soft px-3 py-1.5 text-[0.8125rem] font-semibold text-floodlight">
              {TRIAL_DAYS} dienos nemokamai, kai nori visų
            </span>
            <p className="mt-[18px] flex items-baseline gap-2.5">
              <span className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-none font-extrabold tracking-[-0.04em]">
                {PRICE_EUR_PER_MONTH} €
              </span>
              <span className="text-haze">per mėnesį po bandymo</span>
            </p>
            <p className="mt-[26px] text-[0.9375rem] text-haze">Viskas, kas nemokamai, ir:</p>
            <ul className="mt-3 grid gap-[11px]">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-[11px]">
                  <Check className="mt-0.5 size-[18px] shrink-0 text-floodlight" aria-hidden />
                  <span className="text-[0.9375rem]">{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/registracija"
              className="mt-7 flex min-h-11 items-center justify-center rounded-[14px] bg-floodlight px-6 py-4 font-semibold text-night transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Sukurti nemokamą paskyrą
            </Link>
            <p className="mt-3.5 text-[0.8125rem] text-haze">
              Bandymą įjungi viduje, kai nori. Atšaukti gali bet kada, vienu paspaudimu profilyje. Ilgalaikio pelno niekas negarantuoja, ir mes
              ne.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
