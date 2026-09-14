import Link from 'next/link'
import { brand } from '@/lib/brand'
import { formatEuro } from '@/lib/format-lt'
import { EURO_PER_SECOND, LPT_REPORT_Q1_2026, REMOTE_BETTING_GGR_Q1_2026 } from '@/lib/lpt'
import { GlyphCounter } from './glyph-counter'

export function SiteFooter() {
  return (
    <footer className="bg-slate text-chalk">
      <div className="mx-auto max-w-[76rem] px-5 pt-20 pb-10 sm:px-8 lg:pt-28">
        <p className="max-w-[36rem] text-[1.15rem] text-slate-text">
          Kol esi šiame puslapyje, Lietuvos nuotolinių lažybų bendrovės vidutiniškai uždirbo
        </p>
        <div className="mt-6">
          <GlyphCounter />
        </div>
        <p className="mt-6 max-w-[40rem] text-[0.9rem] leading-snug text-slate-text">
          Pagal Lošimų priežiūros tarnybos 2026 m. I ketvirčio suvestinę nuotolinių lažybų
          bendrosios pajamos buvo {formatEuro(REMOTE_BETTING_GGR_Q1_2026)}, apie{' '}
          {formatEuro(EURO_PER_SECOND, 2)} per sekundę. Tai vidurkis, ne tikro laiko duomenys.{' '}
          <a
            href={LPT_REPORT_Q1_2026}
            rel="noopener"
            className="text-chalk underline decoration-slate-line underline-offset-4 hover:decoration-chalk"
          >
            Suvestinė (PDF)
          </a>
        </p>

        <div className="mt-20 flex flex-col gap-6 border-t border-slate-line pt-8 text-[0.9rem] text-slate-text sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/" className="font-display text-2xl font-extrabold text-chalk">
              {brand.name}
            </Link>
            <p className="mt-2 max-w-[28rem]">
              Informacija apie kainas, ne patarimas lažintis. Mes nepriimam statymų ir nesame
              susiję su kontoromis.
            </p>
          </div>
          <div className="max-w-[24rem] sm:text-right">
            <p className="font-medium text-chalk">Tik nuo 18 metų</p>
            <p className="mt-2">
              Lošimas gali sukelti priklausomybę. Apriboti sau galimybę lošti gali per{' '}
              <a
                href="https://lpt.lrv.lt"
                rel="noopener"
                className="text-chalk underline decoration-slate-line underline-offset-4 hover:decoration-chalk"
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
