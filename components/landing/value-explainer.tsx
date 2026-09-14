'use client'

import { useId, useState } from 'react'
import { edgeOf, formatEdge, formatEuro, formatOdds, kellyFraction } from '@/lib/format-lt'

const FAIR_ODDS = 1.82
const PROBABILITY = 1 / FAIR_ODDS

export function ValueExplainer() {
  const oddsId = useId()
  const bankId = useId()
  const [odds, setOdds] = useState(1.91)
  const [bankroll, setBankroll] = useState(500)

  const edge = edgeOf(odds, FAIR_ODDS)
  // Same rule as the aggregator: quarter Kelly, capped at 5 % of bankroll.
  const stake = Math.round(bankroll * Math.min(0.05, kellyFraction(odds, PROBABILITY) * 0.25))
  const hasValue = edge > 0

  return (
    <section id="kaip-veikia" className="scroll-mt-20 border-t border-line">
      <div className="mx-auto grid max-w-[76rem] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:py-28">
        <div className="max-w-[34rem]">
          <h2 className="text-[2.75rem] sm:text-[3.5rem]">Kodėl kainų skirtumas yra pinigai</h2>
          <p className="mt-6">
            Pinnacle koeficientas {formatOdds(FAIR_ODDS)}, nuėmus kontoros maržą, reiškia apie{' '}
            {Math.round(PROBABILITY * 100)}&nbsp;% tikimybę, kad rungtynėse bus daugiau nei 43,5
            taško.
          </p>
          <p className="mt-4">
            Jei Lietuvos kontora už tą patį statymą moka daugiau, ilguoju laikotarpiu laimėjimai
            atperka pralaimėjimus su kaupu. Tą perteklių vadinam verte.
          </p>
          <p className="mt-4 text-mist">
            Viena diena nieko neįrodo: net geri statymai dažnai pralaimi. Todėl siūlom nedidelę
            sumą nuo bankrollo ir daug statymų, o ne vieną didelį.
          </p>
        </div>

        <div className="rounded-md border border-line bg-card p-6 sm:p-8">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor={oddsId} className="font-medium">
                Kontoros koeficientas
              </label>
              <output htmlFor={oddsId} className="font-display text-3xl font-bold tnum">
                {formatOdds(odds)}
              </output>
            </div>
            <input
              id={oddsId}
              type="range"
              min={1.6}
              max={2.2}
              step={0.01}
              value={odds}
              onChange={(event) => setOdds(Number(event.target.value))}
              className="mt-3 w-full accent-ink"
            />
          </div>

          <div className="mt-7">
            <div className="flex items-baseline justify-between">
              <label htmlFor={bankId} className="font-medium">
                Tavo bankrollas
              </label>
              <output htmlFor={bankId} className="font-display text-3xl font-bold tnum">
                {formatEuro(bankroll)}
              </output>
            </div>
            <input
              id={bankId}
              type="range"
              min={100}
              max={5000}
              step={50}
              value={bankroll}
              onChange={(event) => setBankroll(Number(event.target.value))}
              className="mt-3 w-full accent-ink"
            />
          </div>

          <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-[4px] border border-line bg-line sm:grid-cols-3">
            <div className={`p-4 ${hasValue ? 'bg-floodlight' : 'bg-card'}`}>
              <dt className="text-[0.85rem] text-ink/70">Vertė</dt>
              <dd className="mt-1 font-display text-3xl font-bold tnum" aria-live="polite">
                {formatEdge(edge)}
              </dd>
            </div>
            <div className="bg-card p-4">
              <dt className="text-[0.85rem] text-mist">Vidutiniškai iš 100&nbsp;€ statymų</dt>
              <dd className="mt-1 font-display text-3xl font-bold tnum">
                {formatEuro(edge * 100, 2)}
              </dd>
            </div>
            <div className="bg-card p-4">
              <dt className="text-[0.85rem] text-mist">Siūloma suma, ¼ Kelly</dt>
              <dd className="mt-1 font-display text-3xl font-bold tnum">
                {hasValue && stake > 0 ? formatEuro(stake) : 'Nestatyti'}
              </dd>
            </div>
          </dl>

          <p className="mt-4 min-h-[3rem] text-[0.95rem] text-mist">
            {hasValue
              ? `Kiekvienas koeficientas virš ${formatOdds(FAIR_ODDS)} yra vertė. Kuo didesnis skirtumas, tuo didesnė siūloma suma.`
              : `Už ${formatOdds(FAIR_ODDS)} ar mažiau vertės nėra. Tokio signalo nerodytume.`}
          </p>
        </div>
      </div>
    </section>
  )
}
