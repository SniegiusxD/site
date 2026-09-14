'use client'

import { motion } from 'framer-motion'
import { formatEdge, formatInteger } from '@/lib/format-lt'

// Fixture-level mean CLV by entry edge, 3,693 surfaced bets with a captured
// closing price, 2026-09-01..13. Source: aggregator
// planning/7BET_SMALL_EDGES_DO_NOT_BEAT_THE_CLOSE_2026-09-13.md, section 4.
// `sure` = the 95% fixture-clustered range excludes zero.
// Static until the site reads these from the database.
const BOOKS = ['7BET', 'TopSport', 'Betsson'] as const
const BANDS = ['0–4 %', '4–8 %', '8–15 %', 'virš 15 %'] as const

const CLV: Record<(typeof BOOKS)[number], Array<{ clv: number; sure: boolean }>> = {
  '7BET': [
    { clv: -0.0001, sure: false },
    { clv: 0.0135, sure: true },
    { clv: 0.0435, sure: true },
    { clv: 0.1204, sure: true },
  ],
  TopSport: [
    { clv: 0.0047, sure: false },
    { clv: 0.028, sure: true },
    { clv: 0.0402, sure: false },
    { clv: 0.0918, sure: false },
  ],
  Betsson: [
    { clv: 0.0162, sure: false },
    { clv: 0.0379, sure: true },
    { clv: 0.0668, sure: true },
    { clv: 0.2154, sure: true },
  ],
}

const TOTAL_BETS = 3693
const MAX_CLV = 0.22
const EASE = [0.22, 1, 0.36, 1] as const

function clvLabel(value: number) {
  return Math.abs(value) < 0.0005 ? '0,0 %' : formatEdge(value)
}

export function Proof() {
  return (
    <section id="rezultatai" className="scroll-mt-16 border-t border-rail">
      <div className="mx-auto max-w-[80rem] px-5 py-24 sm:px-8 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="max-w-[34rem]">
            <h2 className="text-[3rem] sm:text-[4rem]">Ką rodo mūsų pačių duomenys</h2>
            <p className="mt-6 text-haze">
              Ilgalaikio pelno skelbti dar per anksti, o išgalvotų atsiliepimų nerašom. Todėl
              rodom tai, ką galima išmatuoti jau dabar: ar signalo kaina buvo geresnė už
              paskutinę Pinnacle kainą prieš rungtynes. Tai vadinama CLV.
            </p>
            <p className="mt-4 text-haze">
              Visose trijose kontorose kuo didesnė vertė signalo metu, tuo didesnis CLV. Taip ir
              turi būti, jei skirtumai tikri.
            </p>
            <p className="mt-4 text-haze">
              Ne viskas veikia vienodai: mažiausios 7BET vertės uždarymo kainos neįveikia.
              Suvestų statymų rezultatas kol kas +0,4&nbsp;% per 592 rungtynes. Tai per maža
              imtis, kad ką nors įrodytų.
            </p>
          </div>

          <div>
            <p className="font-medium">Vidutinis CLV pagal vertę signalo metu</p>

            {/* Phones: one horizontal bar list per book. */}
            <div aria-hidden className="mt-8 space-y-8 sm:hidden">
              {BOOKS.map((book) => (
                <div key={book}>
                  <p className="font-medium">{book}</p>
                  <div className="mt-3 space-y-2.5">
                    {CLV[book].map((cell, index) => (
                      <div
                        key={BANDS[index]}
                        className="grid grid-cols-[4.5rem_1fr_3.75rem] items-center gap-3 text-[0.85rem]"
                      >
                        <span className="text-haze">{BANDS[index]}</span>
                        <span className="h-2.5 overflow-hidden rounded-full bg-rail">
                          <motion.span
                            initial={{ width: 0 }}
                            whileInView={{ width: `${Math.max(0, cell.clv / MAX_CLV) * 100}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: EASE, delay: index * 0.06 }}
                            className={`block h-full rounded-full ${cell.sure ? 'bg-chalk' : 'bg-steel'}`}
                          />
                        </span>
                        <span className={`text-right ${cell.sure ? 'font-semibold' : 'text-haze-dim'}`}>
                          {clvLabel(cell.clv)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Wider screens: four columns per book. */}
            <div aria-hidden className="mt-8 hidden grid-cols-3 gap-8 sm:grid">
              {BOOKS.map((book) => (
                <div key={book}>
                  <div className="flex h-72 items-end gap-1.5 border-b border-rail-strong sm:gap-2.5">
                    {CLV[book].map((cell, index) => {
                      const height = Math.max(0, cell.clv / MAX_CLV) * 100
                      return (
                        <div key={BANDS[index]} className="flex h-full flex-1 flex-col justify-end">
                          <span
                            className={`mb-1.5 text-center text-[0.7rem] tnum sm:text-[0.8rem] ${
                              cell.sure ? 'font-semibold text-chalk' : 'text-haze-dim'
                            }`}
                          >
                            {clvLabel(cell.clv)}
                          </span>
                          <motion.span
                            initial={{ height: 0 }}
                            whileInView={{ height: `${height}%` }}
                            viewport={{ once: true, margin: '-15% 0px' }}
                            transition={{ duration: 0.9, ease: EASE, delay: index * 0.08 }}
                            className={`block rounded-t-md ${
                              cell.sure ? 'bg-chalk' : 'bg-transparent shadow-[inset_0_0_0_1.5px_var(--steel)]'
                            }`}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-center font-medium">{book}</p>
                </div>
              ))}
            </div>

            <div className="sr-only">
            <table>
              <caption>Vidutinis CLV pagal vertę signalo metu</caption>
              <thead>
                <tr>
                  <th scope="col">Vertė</th>
                  {BOOKS.map((book) => (
                    <th key={book} scope="col">
                      {book}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BANDS.map((band, index) => (
                  <tr key={band}>
                    <th scope="row">{band}</th>
                    {BOOKS.map((book) => (
                      <td key={book}>
                        {clvLabel(CLV[book][index].clv)}
                        {CLV[book][index].sure ? '' : ' (dar gali būti atsitiktinis)'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            <p className="mt-6 text-[0.9rem] text-haze">
              Vertės grupės signalo metu: {BANDS.join(', ')}. Ryškus: skirtumas nuo nulio patikimas
              (95&nbsp;%). Blankus: dar gali būti atsitiktinis. Iš viso {formatInteger(TOTAL_BETS)}{' '}
              statymai su užfiksuota uždarymo kaina, 2026 m. rugsėjo 1–13 d.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
