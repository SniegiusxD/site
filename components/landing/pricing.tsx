import { Check } from 'lucide-react'
import Link from 'next/link'
import { Reveal } from './motion-primitives'

const INCLUDED = [
  'Visi 7BET, TopSport ir Betsson signalai',
  'Visų kontorų kainos prie kiekvieno signalo',
  'Kopijuojamas pavadinimas kiekvienai kontorai',
  'Bankrollas, Kelly dalis ir limitai pagal tave',
  'Statymų sekimas su automatiniu atsiskaitymu',
  'CLV ir rezultatai pagal kontorą',
  'Signalai į Telegram',
]

export function Pricing() {
  return (
    <section id="kaina" className="scroll-mt-16 bg-night px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div className="mx-auto grid max-w-[80rem] items-center gap-[clamp(32px,5vw,64px)] lg:grid-cols-[1fr_minmax(0,32rem)]">
        <div className="min-w-0">
          <Reveal>
            <h2 className="text-[clamp(1.875rem,3.2vw,2.75rem)] leading-[0.95]">Vienas planas. Pirmos 7 dienos nemokamai.</h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-5 max-w-[56ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-haze">
              Jokių paketų ir statymų kvotų. Per bandymą matai viską, ką mato mokantys nariai. Kortelės bandymui neprašom, todėl nieko ir
              nenuskaitom.
            </p>
          </Reveal>
        </div>
        <Reveal variant="board">
          <div className="rounded-[20px] bg-stand p-[clamp(24px,3vw,36px)] shadow-[inset_0_0_0_1px_var(--rail),0_30px_80px_-30px_rgb(0_0_0/0.8)]">
            <span className="inline-block rounded-full bg-floodlight-soft px-3 py-1.5 text-[0.8125rem] font-semibold text-floodlight">7 dienos nemokamai</span>
            <p className="mt-[18px] flex items-baseline gap-2.5">
              <span className="font-display text-[clamp(3rem,6vw,4.5rem)] leading-none font-extrabold tracking-[-0.04em]">25 €</span>
              <span className="text-haze">per mėnesį po bandymo</span>
            </p>
            <ul className="mt-[26px] grid gap-[11px]">
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
              Pradėti nemokamą bandymą
            </Link>
            <p className="mt-3.5 text-[0.8125rem] text-haze">Atšaukti gali bet kada, vienu paspaudimu profilyje. Ilgalaikio pelno niekas negarantuoja, ir mes ne.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
