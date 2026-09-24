'use client'

import type { TrustLabel } from '@/lib/close-evidence'
import { EVIDENCE, evidencePeriod } from '@/lib/evidence'
import { formatEdge, formatInteger } from '@/lib/format-lt'
import { ClvTrust } from './clv-trust'
import { Reveal, Roll, useInViewOnce } from './motion-primitives'

// Fixture-level mean CLV by entry edge, 3,693 surfaced bets with a captured closing
// price, 2026-09-01..13. Source: aggregator
// planning/7BET_SMALL_EDGES_DO_NOT_BEAT_THE_CLOSE_2026-09-13.md, section 4.
// `sure` = the 95% fixture-clustered range excludes zero.
const BANDS = ['0–4 %', '4–8 %', '8–15 %', 'virš 15 %'] as const
const TOTAL_BETS = 3693
const MAX_CLV = 0.22

const BOOKS: Array<{ book: string; note: string; cells: Array<{ clv: number; sure: boolean }> }> = [
  {
    book: '7BET',
    note: 'Mažos vertės iki 4 % uždarymo kainos neaplenkia.',
    cells: [
      { clv: -0.0001, sure: false },
      { clv: 0.0135, sure: true },
      { clv: 0.0435, sure: true },
      { clv: 0.1204, sure: true },
    ],
  },
  {
    book: 'TopSport',
    note: 'Patvirtinta tik 4–8 % juosta, kitoms dar per mažai statymų.',
    cells: [
      { clv: 0.0047, sure: false },
      { clv: 0.028, sure: true },
      { clv: 0.0402, sure: false },
      { clv: 0.0918, sure: false },
    ],
  },
  {
    book: 'Betsson',
    note: 'Stipriausias CLV, bet ir mažiausiai signalų per parą.',
    cells: [
      { clv: 0.0162, sure: false },
      { clv: 0.0379, sure: true },
      { clv: 0.0668, sure: true },
      { clv: 0.2154, sure: true },
    ],
  },
]

/** A band whose interval still crosses zero: hatched and grey, never green. */
const UNSURE_FILL =
  'bg-[repeating-linear-gradient(135deg,var(--steel)_0_4px,transparent_4px_8px)] shadow-[inset_0_0_0_1px_var(--steel)]'

const clvLabel = (value: number) => (Math.abs(value) < 0.0005 ? '0,0 %' : formatEdge(value))

/** closeTrust: the scanner's current verdict on closing prices, read by the page. */
export function Proof({ closeTrust }: { closeTrust: TrustLabel }) {
  return (
    <section id="duomenys" className="relative scroll-mt-16 overflow-hidden bg-night-alt px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-20%] top-[-80px] h-[1040px] [mask-image:radial-gradient(80%_60%_at_14%_8%,#000,transparent_60%)]"
      >
        <div className="kr-stripes absolute inset-y-0 -left-[272px] right-0 [animation-direction:reverse]" />
      </div>
      <div className="relative mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95]">Ką rodo mūsų pačių duomenys</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-5 max-w-[64ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-haze">
            Ilgalaikio pelno skelbti dar per anksti, o išgalvotų atsiliepimų nerašom. Todėl rodom CLV: ar signalo kaina buvo geresnė už
            paskutinę Pinnacle kainą prieš rungtynes. {formatInteger(TOTAL_BETS)} statymai su užfiksuota uždarymo kaina, 2026 m. rugsėjo
            1–13 d.
          </p>
        </Reveal>
        {/* The two states differ in shape as well as colour: a solid bar is a
            measured difference, a hatched one is not yet told apart from chance.
            A green outline used to mark the second, and read as a selection. */}
        <Reveal delay={140}>
          <ul className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-[0.9375rem] text-haze" aria-label="Kaip skaityti stulpelius">
            <li className="flex items-center gap-2.5">
              <span aria-hidden className="h-3.5 w-9 rounded-full bg-floodlight" />
              Patikima: 95 % intervalas nekerta nulio
            </li>
            <li className="flex items-center gap-2.5">
              <span aria-hidden className={`h-3.5 w-9 rounded-full ${UNSURE_FILL}`} />
              Dar nepakanka duomenų: gali būti atsitiktinumas
            </li>
          </ul>
        </Reveal>
        {/* The scanner's own judgement of the closing prices behind CLV, today. */}
        <Reveal delay={170}>
          <ClvTrust label={closeTrust} className="mt-4 max-w-[64ch]" />
        </Reveal>

        <div className="mt-[clamp(40px,5vw,72px)] grid gap-5 lg:grid-cols-3">
          {BOOKS.map((book, index) => (
            <Reveal key={book.book} delay={index * 60}>
              <BookCard {...book} />
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-7">
          <div className="grid gap-6 rounded-[20px] bg-stand p-[clamp(20px,2.6vw,28px)] shadow-[inset_0_0_0_1px_var(--rail)] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
            <div>
              <Roll value={EVIDENCE.fixtures} className="block font-display text-[2rem] leading-none font-extrabold tracking-[-0.03em]" />
              <p className="mt-1.5 text-[0.8125rem] text-haze">
                rungtynės su atsiskaičiusiu signalu, {evidencePeriod()}
              </p>
            </div>
            <div>
              {/* Not green, and with its interval: at this many fixtures the
                  return cannot be told apart from zero, and a coloured number
                  would say otherwise. */}
              <Roll
                value={EVIDENCE.roi * 100}
                decimals={2}
                signed
                suffix=" %"
                className="block font-display text-[2rem] leading-none font-extrabold tracking-[-0.03em]"
              />
              <p className="mt-1.5 text-[0.8125rem] text-haze">
                grąža, nuo {formatEdge(EVIDENCE.roiLow)} iki {formatEdge(EVIDENCE.roiHigh)}; skaičiuojam rungtynes, ne signalus
              </p>
            </div>
            <div>
              <Roll value={EVIDENCE.averageOdds} decimals={2} className="block font-display text-[2rem] leading-none font-extrabold tracking-[-0.03em]" />
              <p className="mt-1.5 text-[0.8125rem] text-haze">
                vidutinis koeficientas · {formatInteger(EVIDENCE.signals)} signalų (vykdymo apimtis)
              </p>
            </div>
            <p className="text-[0.875rem] text-haze">
              Kelios dienos nieko neįrodo. Todėl rodom ir CLV: jis matuoja, ar kaina buvo gera, nepriklausomai nuo to, ar statymas laimėjo.
              {' '}CLV rodo kainos kokybę, o ne pelno garantiją — su tokia imtimi net teigiama grąža dar gali būti sėkmė.
            </p>
          </div>
        </Reveal>

        <div className="sr-only">
          <table>
            <caption>Vidutinis CLV pagal vertę signalo metu</caption>
            <thead>
              <tr>
                <th scope="col">Vertė</th>
                {BOOKS.map((book) => (
                  <th key={book.book} scope="col">
                    {book.book}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BANDS.map((band, index) => (
                <tr key={band}>
                  <th scope="row">{band}</th>
                  {BOOKS.map((book) => (
                    <td key={book.book}>
                      {clvLabel(book.cells[index].clv)}
                      {book.cells[index].sure ? '' : ' (dar gali būti atsitiktinis)'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function BookCard({ book, note, cells }: { book: string; note: string; cells: Array<{ clv: number; sure: boolean }> }) {
  const [ref, seen] = useInViewOnce<HTMLDivElement>()
  return (
    <div ref={ref} aria-hidden className="h-full rounded-[20px] bg-stand p-[clamp(20px,2.6vw,28px)] shadow-[inset_0_0_0_1px_var(--rail)]">
      <div className="flex items-baseline justify-between gap-2.5">
        <h3 className="text-[1.375rem] tracking-[-0.02em]">{book}</h3>
        <span className="text-[0.8125rem] text-haze">CLV</span>
      </div>
      <div className="mt-5 grid gap-3.5">
        {cells.map((cell, index) => (
          <div key={BANDS[index]} className="grid grid-cols-[minmax(52px,72px)_minmax(0,1fr)_62px] items-center gap-2.5">
            <span className="text-[0.8125rem] whitespace-nowrap text-haze">{BANDS[index]}</span>
            <span className="relative h-3.5 rounded-full bg-night">
              <span
                className={`absolute inset-y-0 left-0 overflow-hidden rounded-full transition-[width] duration-[800ms] ease-[cubic-bezier(.22,1,.36,1)] ${
                  cell.sure ? 'bg-floodlight' : UNSURE_FILL
                }`}
                style={{ width: seen ? `${Math.max(2, (Math.abs(cell.clv) / MAX_CLV) * 100).toFixed(1)}%` : '0%', transitionDelay: `${index * 80}ms` }}
              >
                {cell.sure && (
                  <span
                    className="block h-3.5 w-[45%] animate-[kr-bar-sweep_3.6s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.5),transparent)]"
                    style={{ animationDelay: `${index * 0.55}s` }}
                  />
                )}
              </span>
            </span>
            <span className={`text-right text-[0.875rem] font-semibold tnum ${cell.sure && cell.clv > 0.0005 ? 'text-floodlight' : 'text-haze'}`}>
              {clvLabel(cell.clv)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-[18px] text-[0.8125rem] text-haze">{note}</p>
    </div>
  )
}
