'use client'

import { useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { CopyButton } from '@/components/landing/copy-button'
import { edgeOf, formatEdge, formatEuro, formatOdds, formatPercent, kellyFraction } from '@/lib/format-lt'
import { BOOKS, type LandingSignal, SIGNALS_CAPTURED_LABEL, landingSignals } from '@/lib/landing-signals'

const BANKROLL = 500

/** Quarter Kelly, capped at 5 % of the bankroll: the app's own rule. */
const stakeFor = (signal: LandingSignal, odds: number) =>
  BANKROLL * Math.min(0.05, kellyFraction(odds, 1 / signal.fairOdds) * 0.25)

/**
 * A real captured signal, opened the way a member would open it, without an
 * account. The data is from one recorded scan and says so — a demo pretending
 * to be live would be the dishonest kind.
 */
export function DemoSignal() {
  const [id, setId] = useState(landingSignals[0].id)
  const signal = landingSignals.find((entry) => entry.id === id) ?? landingSignals[0]
  const price = signal.prices.find((entry) => entry.book === signal.valueBook) ?? signal.prices[0]
  const edge = edgeOf(price.odds, signal.fairOdds)
  const stake = stakeFor(signal, price.odds)

  const odds = signal.prices.map((entry) => entry.odds)
  const low = Math.min(signal.fairOdds, ...odds) * 0.94
  const high = Math.max(signal.fairOdds, ...odds) * 1.03
  const at = (value: number) => ((value - low) / (high - low)) * 100

  return (
    <div className="mx-auto max-w-[46rem] px-5 pb-24 sm:px-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pasirink signalą">
        {landingSignals.map((entry) => {
          const entryPrice = entry.prices.find((item) => item.book === entry.valueBook) ?? entry.prices[0]
          const active = entry.id === signal.id
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={active}
              onClick={() => setId(entry.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[0.9rem] font-medium transition-colors ${
                active ? 'bg-chalk text-night' : 'bg-stand text-chalk hairline hover:bg-stand-hover'
              }`}
            >
              <BookMark book={entry.valueBook} size="sm" />
              {/* Several lines of one match are separate signals, so the market
                  has to be in the label or two chips read the same. */}
              <span className="truncate">
                {entryPrice.event.split(' – ')[0]} · {entry.market.toLowerCase()}
              </span>
            </button>
          )
        })}
      </div>

      <section className="mt-6 rounded-2xl bg-stand p-5 hairline sm:p-6">
        <p className="text-[0.9rem] text-haze">
          {signal.sport}, {signal.kickoffLabel}
        </p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-[clamp(1.6rem,3vw,2.2rem)]">{price.event}</h2>
          <CopyButton text={price.event} label={`${price.book}: ${price.event}`} className="mt-1 shrink-0" />
        </div>
        <p className="mt-2 text-haze">
          {signal.market}: <span className="text-chalk">{price.selection}</span>
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-night-deep p-4">
            <p className="text-[0.85rem] text-haze">{price.book} siūlo</p>
            <p className="mt-1 font-display text-[2.4rem] leading-none font-bold text-floodlight tnum">{formatOdds(price.odds)}</p>
          </div>
          <div className="rounded-xl bg-night-deep p-4">
            <p className="text-[0.85rem] text-haze">Tavo vertė</p>
            <p className="mt-1 font-display text-[2.4rem] leading-none font-bold tnum">{formatEdge(edge)}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-6" aria-label="Kainos visose kontorose">
        <h3 className="text-[1.4rem]">Kainos visose kontorose</h3>
        <div className="mt-4 grid gap-2.5">
          {BOOKS.map((book) => {
            const entry = signal.prices.find((item) => item.book === book)
            if (!entry) {
              return (
                <div key={book} className="flex items-center gap-3 text-[0.9rem]">
                  <BookMark book={book} size="sm" />
                  <span className="w-[5rem] text-haze">{book}</span>
                  <span className="text-haze-dim">kainos neradom</span>
                </div>
              )
            }
            const beats = entry.odds > signal.fairOdds
            return (
              <div key={book} className="flex items-center gap-3">
                <BookMark book={book} size="sm" />
                <span className="w-[5rem] shrink-0 text-[0.9rem] text-haze">{book}</span>
                <span className="relative h-2.5 flex-1 rounded-full bg-night-deep">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-full ${beats ? 'bg-floodlight' : 'bg-steel'}`}
                    style={{ width: `${at(entry.odds)}%` }}
                  />
                  <span className="absolute -inset-y-1 w-px bg-chalk/70" style={{ left: `${at(signal.fairOdds)}%` }} aria-hidden />
                </span>
                <span className={`w-[3.2rem] shrink-0 text-right font-semibold tnum ${beats ? 'text-floodlight' : ''}`}>
                  {formatOdds(entry.odds)}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-4 border-t border-rail pt-3.5 text-[0.9rem] text-haze">
          Balta linija — tikroji kaina {formatOdds(signal.fairOdds)} ({formatPercent(1 / signal.fairOdds, 1)} tikimybė). Pinnacle su marža
          siūlo {formatOdds(signal.pinnacleOdds)}.
        </p>
      </section>

      <section className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-6" aria-label="Siūloma suma">
        <h3 className="text-[1.4rem]">Kiek statyti</h3>
        <p className="mt-2 text-haze">
          Iš {formatEuro(BANKROLL)} banko ketvirtis Kelly duoda{' '}
          <span className="font-semibold text-chalk tnum">{formatEuro(stake, 2)}</span>. Viduje suma skaičiuojama nuo tavo banko ir
          neviršija tavo kontoros limito.
        </p>
      </section>

      <p className="mt-6 text-center text-[0.875rem] text-haze-dim">
        Tikras signalas iš mūsų skenavimo, {SIGNALS_CAPTURED_LABEL}. Gyvus signalus matai prisijungęs — nemokama paskyra rodo iki 2 % vertės.
      </p>
    </div>
  )
}
