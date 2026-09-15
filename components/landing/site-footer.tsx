import Link from 'next/link'
import { brand } from '@/lib/brand'
import { formatEuro } from '@/lib/format-lt'
import { EURO_PER_SECOND, LPT_REPORT_Q1_2026, REMOTE_BETTING_GGR_Q1_2026 } from '@/lib/lpt'
import { GlyphCounter } from './glyph-counter'

export function SiteFooter() {
  return (
    <footer className="border-t border-rail bg-night-deep">
      <div className="mx-auto max-w-[80rem] px-5 pt-24 pb-10 sm:px-8 lg:pt-32">
        <p className="max-w-[36rem] text-[1.2rem] text-haze">
          Šiandien Lietuvos nuotolinių lažybų bendrovės vidutiniškai uždirbo
        </p>
        <div className="mt-8">
          <GlyphCounter />
        </div>
        <p className="mt-8 max-w-[44rem] text-[0.9rem] leading-snug text-haze-dim">
          Skaičiuojama nuo vidurnakčio pagal Lošimų priežiūros tarnybos 2026 m. I ketvirčio
          suvestinę: nuotolinių lažybų bendrosios pajamos {formatEuro(REMOTE_BETTING_GGR_Q1_2026)},
          apie {formatEuro(EURO_PER_SECOND, 2)} per sekundę. Tai vidurkis, ne tikro laiko duomenys.{' '}
          <a
            href={LPT_REPORT_Q1_2026}
            rel="noopener"
            className="text-haze underline decoration-rail-strong underline-offset-4 hover:text-chalk"
          >
            Suvestinė (PDF)
          </a>
        </p>

        <div className="mt-24 grid gap-8 border-t border-rail pt-10 text-[0.9rem] text-haze sm:grid-cols-[1fr_auto]">
          <div>
            <Link href="/" className="font-display text-3xl font-extrabold text-chalk">
              {brand.name}
            </Link>
            <p className="mt-3 max-w-[30rem]">
              Informacija apie kainas, ne patarimas lažintis. Statymų nepriimam ir su kontoromis
              nesame susiję.
            </p>
            <nav aria-label="Nuorodos" className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
              <Link href="/skaiciuokle" className="hover:text-chalk">
                Skaičiuoklė
              </Link>
              <Link href="/taisykles" className="hover:text-chalk">
                Naudojimosi taisyklės
              </Link>
              <Link href="/privatumas" className="hover:text-chalk">
                Privatumo politika
              </Link>
            </nav>
          </div>
          <div className="max-w-[24rem] sm:text-right">
            <p className="font-medium text-chalk">Tik nuo 18 metų</p>
            <p className="mt-2">
              Lošimas gali sukelti priklausomybę. Apriboti sau galimybę lošti gali per{' '}
              <a
                href="https://lpt.lrv.lt"
                rel="noopener"
                className="text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk"
              >
                Lošimų priežiūros tarnybą
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
