import { formatEdge, formatInteger } from '@/lib/format-lt'

// Fixture-level mean CLV by entry edge, 3,693 surfaced bets with a captured
// closing price, 2026-09-01..13. Source: aggregator
// planning/7BET_SMALL_EDGES_DO_NOT_BEAT_THE_CLOSE_2026-09-13.md, section 4.
// `sure` = the 95% fixture-clustered range excludes zero.
// Static until the site reads these from the database.
const BOOKS = ['7BET', 'TopSport', 'Betsson'] as const

const BANDS: Array<{ label: string; cells: Array<{ clv: number; sure: boolean }> }> = [
  {
    label: '0–4 %',
    cells: [
      { clv: -0.0001, sure: false },
      { clv: 0.0047, sure: false },
      { clv: 0.0162, sure: false },
    ],
  },
  {
    label: '4–8 %',
    cells: [
      { clv: 0.0135, sure: true },
      { clv: 0.028, sure: true },
      { clv: 0.0379, sure: true },
    ],
  },
  {
    label: '8–15 %',
    cells: [
      { clv: 0.0435, sure: true },
      { clv: 0.0402, sure: false },
      { clv: 0.0668, sure: true },
    ],
  },
  {
    label: 'Virš 15 %',
    cells: [
      { clv: 0.1204, sure: true },
      { clv: 0.0918, sure: false },
      { clv: 0.2154, sure: true },
    ],
  },
]

const TOTAL_BETS = 3693

export function Proof() {
  return (
    <section id="rezultatai" className="scroll-mt-20 border-t border-line bg-chalk-deep">
      <div className="mx-auto max-w-[76rem] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div className="max-w-[34rem]">
            <h2 className="text-[2.75rem] sm:text-[3.5rem]">Ką rodo mūsų pačių duomenys</h2>
            <p className="mt-6">
              Ilgalaikio pelno skelbti dar per anksti. Todėl rodom tai, ką galima išmatuoti jau
              dabar: ar kontoroje rasta kaina buvo geresnė už paskutinę Pinnacle kainą prieš
              rungtynes. Tai vadinama CLV. Teigiamas CLV reiškia, kad rinka vėliau pasislinko
              tavo pusėn.
            </p>
            <p className="mt-4">
              Visose trijose kontorose kuo didesnė vertė signalo metu, tuo didesnis CLV. Taip ir
              turi būti, jei skirtumai tikri.
            </p>
            <p className="mt-4 text-mist">
              Ne viskas veikia: mažiausios 7BET vertės uždarymo kainos neįveikia. Suvestų
              statymų rezultatas kol kas +0,4&nbsp;% per 592 rungtynes, per maža imtis, kad ką
              nors įrodytų.
            </p>
          </div>

          <div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[20rem] border-collapse text-left">
                <caption className="pb-4 text-left font-medium">
                  Vidutinis CLV pagal vertę signalo metu
                </caption>
                <thead>
                  <tr className="border-b-2 border-ink text-[0.9rem] text-mist">
                    <th scope="col" className="py-3 pr-3 font-medium">
                      Vertė
                    </th>
                    {BOOKS.map((book) => (
                      <th key={book} scope="col" className="py-3 pl-3 text-right font-medium">
                        {book}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BANDS.map((band) => (
                    <tr key={band.label} className="border-b border-line">
                      <th scope="row" className="py-4 pr-3 font-medium">
                        {band.label}
                      </th>
                      {band.cells.map((cell, index) => (
                        <td
                          key={BOOKS[index]}
                          className={`py-4 pl-3 text-right font-display text-[1.6rem] tnum sm:text-3xl ${
                            cell.sure ? 'font-bold text-ink' : 'font-semibold text-mist'
                          }`}
                        >
                          {Math.abs(cell.clv) < 0.0005 ? '0,0 %' : formatEdge(cell.clv)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[0.9rem] text-mist">
              Juodai: skirtumas nuo nulio patikimas (95&nbsp;%). Pilkai: dar gali būti atsitiktinis.
              Iš viso {formatInteger(TOTAL_BETS)} statymai su užfiksuota uždarymo kaina, 2026 m.
              rugsėjo 1–13 d.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
