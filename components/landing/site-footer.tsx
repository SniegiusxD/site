import Link from 'next/link'
import { brand } from '@/lib/brand'
import { formatEuro } from '@/lib/format-lt'
import { EURO_PER_SECOND, LPT_REPORT_Q1_2026, REMOTE_BETTING_GGR_Q1_2026 } from '@/lib/lpt'
import { GlyphField } from './glyph-field'

export function SiteFooter() {
  return (
    <footer className="border-t border-rail bg-night">
      <div className="mx-auto max-w-[80rem] px-5 pt-[clamp(48px,6vw,80px)] text-center sm:px-8">
        <p className="text-[0.9375rem] text-haze">Šiandien Lietuvos nuotolinių lažybų bendrovės vidutiniškai uždirbo</p>
      </div>
      <GlyphField />
      <div className="mx-auto max-w-[80rem] px-5 pb-[clamp(48px,6vw,72px)] sm:px-8">
        <p className="mx-auto max-w-[72ch] text-center text-[0.8125rem] text-haze">
          Skaičiuojama nuo vidurnakčio pagal Lošimų priežiūros tarnybos 2026 m. I ketvirčio suvestinę: nuotolinių lažybų bendrosios pajamos{' '}
          {formatEuro(REMOTE_BETTING_GGR_Q1_2026)}, apie {formatEuro(EURO_PER_SECOND, 2)} per sekundę. Tai vidurkis, ne tikro laiko duomenys.{' '}
          <a href={LPT_REPORT_Q1_2026} rel="noopener" className="text-floodlight underline decoration-floodlight/40 underline-offset-4 hover:decoration-floodlight">
            Suvestinė (PDF)
          </a>
        </p>

        <div className="mt-[clamp(40px,5vw,64px)] grid gap-8 border-t border-rail pt-7 text-[0.875rem] text-haze sm:grid-cols-[1fr_auto]">
          <div>
            <Link href="/" className="font-display text-[1.375rem] font-extrabold tracking-[-0.03em] text-chalk">
              {brand.name}
            </Link>
            <p className="mt-2.5 max-w-[52ch]">Informacija apie kainas, ne patarimas lažintis. Statymų nepriimam ir su kontoromis nesame susiję.</p>
            <nav aria-label="Nuorodos" className="mt-4 flex flex-wrap gap-x-6">
              {[
                { href: '/skaiciuokle', label: 'Skaičiuoklė' },
                { href: '/taisykles', label: 'Naudojimosi taisyklės' },
                { href: '/privatumas', label: 'Privatumo politika' },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="flex min-h-11 items-center transition-colors hover:text-chalk">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="max-w-[26rem] sm:text-right">
            <p className="font-medium text-chalk">Tik nuo 18 metų</p>
            <p className="mt-2">
              Lošimas gali sukelti priklausomybę. Apriboti sau galimybę lošti gali per{' '}
              <a href="https://lpt.lrv.lt" rel="noopener" className="text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk">
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
