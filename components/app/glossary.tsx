import { ChevronDown } from 'lucide-react'

const TERMS: Array<{ term: string; body: string }> = [
  {
    term: 'Tikroji kaina',
    body: 'Pinnacle koeficientas, iš kurio išimta marža. Tai artimiausias turimas skaičius tikrai baigties tikimybei.',
  },
  {
    term: 'Vertė',
    body: 'Kiek kontoros koeficientas didesnis už tikrąją kainą. 5 % vertė reiškia, kad už tą patį įvykį moka 5 % daugiau, nei jis vertas.',
  },
  {
    term: 'Uždarymo kaina ir CLV',
    body: 'Kaina prieš pat pradžią, kai rinka žino daugiausia. CLV rodo, kiek tavo kaina buvo geresnė už ją. Tai kainos kokybės matas, ne pelno pažadas.',
  },
  {
    term: 'Vertė, sėkmė ir rezultatas',
    body: 'Rezultatas = vertė + sėkmė. Vertė yra tai, ką uždirbo kainos; sėkmė — atsitiktinė dalis, kuri per šimtus statymų traukiasi į nulį.',
  },
  {
    term: 'Kontorų limitai',
    body: 'Lietuvos kontoros apkarpo laiminčias paskyras: leidžia pastatyti mažiau arba pasiūlo prastesnį koeficientą. Įrašyk limitą nustatymuose, o statyme — kaip buvo iš tikrųjų.',
  },
  {
    term: 'Rodomas koeficientas',
    body: 'Signalas rodo kainą, kurią pagavom skenuodami. Kol spėji atidaryti kontorą, ji gali būti pasikeitusi arba dingusi — tada statyk tik jei vertė vis dar yra.',
  },
]

/**
 * The words the product uses, in one place. Members who cannot tell CLV from
 * profit read a losing month as a broken service, so the terms are explained
 * next to the numbers they describe rather than in a help page nobody opens.
 */
export function Glossary() {
  return (
    <details className="group mt-4 rounded-2xl bg-stand hairline">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-medium sm:px-7">
        Ką reiškia šie skaičiai
        <ChevronDown className="size-5 shrink-0 text-haze transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <dl className="grid gap-4 border-t border-rail px-5 py-5 sm:px-7">
        {TERMS.map((item) => (
          <div key={item.term}>
            <dt className="font-medium">{item.term}</dt>
            <dd className="mt-0.5 max-w-[72ch] text-[0.95rem] leading-normal text-haze">{item.body}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
