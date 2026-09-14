import { Check } from 'lucide-react'
import Link from 'next/link'

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
    <section id="kaina" className="scroll-mt-16 border-t border-rail">
      <div className="mx-auto grid max-w-[80rem] items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-32">
        <div className="max-w-[34rem]">
          <h2 className="text-[3rem] sm:text-[4rem]">Vienas planas. Pirmos 7 dienos nemokamai.</h2>
          <p className="mt-6 text-haze">
            Jokių paketų ir statymų kvotų. Per bandymą matai viską, ką mato mokantys nariai. Jei
            netinka, tiesiog nieko nedarai: kortelės bandymui neprašom, todėl nieko ir
            nenuskaičiuosim.
          </p>
        </div>

        <div className="lift rounded-3xl bg-stand p-7 sm:p-10">
          <p className="inline-flex rounded-full bg-pitch-soft px-3 py-1 text-[0.9rem] font-medium text-pitch">
            7 dienos nemokamai
          </p>
          <p className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-[5.5rem] leading-none font-extrabold tnum">25 €</span>
            <span className="text-haze">per mėnesį po bandymo</span>
          </p>
          <ul className="mt-8 space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3">
                <Check className="mt-1 size-5 shrink-0 text-pitch" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/registracija"
            className="mt-10 block rounded-xl bg-chalk px-6 py-4 text-center text-[1.05rem] font-semibold text-night transition-transform duration-200 hover:bg-white active:scale-[0.98]"
          >
            Pradėti nemokamą bandymą
          </Link>
          <p className="mt-4 text-center text-[0.9rem] text-haze-dim">
            Atšaukti gali bet kada, vienu paspaudimu profilyje.
          </p>
        </div>
      </div>
    </section>
  )
}
