import Link from 'next/link'
import { PriceRail } from './price-rail'

export function Hero() {
  return (
    <section>
      <div className="mx-auto grid max-w-[76rem] items-center gap-12 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pt-20 lg:pb-28">
        <div className="max-w-[36rem]">
          <h1 className="text-[3.5rem] sm:text-[4.75rem] lg:text-[5.5rem]">
            Matyk, kuri kontora moka daugiau, nei verta
          </h1>
          <p className="mt-7 text-[1.15rem] leading-relaxed text-ink/80">
            Lyginam 7BET, TopSport ir Betsson koeficientus su Pinnacle kaina be maržos. Kai
            skirtumas tavo naudai, parodom visų trijų kontorų kainas, siūlomą sumą ir statymo
            pavadinimą, kurį nukopijuoji ir įklijuoji paieškoje.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
            <Link
              href="/app"
              className="rounded-[4px] bg-ink px-6 py-3.5 text-[1.05rem] font-medium text-chalk hover:bg-slate"
            >
              Susikurti paskyrą
            </Link>
            <a
              href="#kaip-veikia"
              className="text-[1.05rem] underline decoration-line decoration-2 underline-offset-[6px] hover:decoration-ink"
            >
              Kaip tai veikia
            </a>
          </div>
        </div>

        <PriceRail />
      </div>
    </section>
  )
}
