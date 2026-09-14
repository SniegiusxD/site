'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Minus, Plus, Send } from 'lucide-react'
import { useState } from 'react'
import { edgeOf, formatEdge, formatOdds, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName, landingSignals } from '@/lib/landing-signals'
import { BookMark } from './book-mark'
import { CopyButton } from './copy-button'

const EASE = [0.22, 1, 0.36, 1] as const

// The three-book fixture: every book spells it differently.
const threeBook = landingSignals.find((signal) => signal.id === 'breogan-rilski-hcp-home')!
// The Betsson total used for the closed-signal and Telegram tiles.
const vefTotal = landingSignals.find((signal) => signal.id === 'vef-absheron-total-171')!

export function ProductTiles() {
  return (
    <section id="funkcijos" className="scroll-mt-16 border-t border-rail bg-night-deep">
      <div className="mx-auto max-w-[80rem] px-5 py-24 sm:px-8 lg:py-32">
        <div className="max-w-[44rem]">
          <h2 className="text-[3rem] sm:text-[4rem]">Nuo signalo iki statymo be spėliojimo</h2>
          <p className="mt-6 text-[1.1rem] text-haze">
            Visa tai veikia ir čia. Spaudinėk.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-6">
          <AllBooksTile />
          <FilterTile />
          <CopyNameTile />
          <LimitTile />
          <BankrollTile />
          <ClosedTile />
          <TelegramTile />
        </div>
      </div>
    </section>
  )
}

function Tile({
  title,
  body,
  className = '',
  children,
}: {
  title: string
  body: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <article className={`flex min-w-0 flex-col rounded-2xl bg-stand p-6 hairline sm:p-7 ${className}`}>
      <h3 className="text-[1.75rem]">{title}</h3>
      <p className="mt-2 text-[0.98rem] text-haze">{body}</p>
      <div className="mt-6 flex-1">{children}</div>
    </article>
  )
}

function AllBooksTile() {
  const prices = [...threeBook.prices].sort((a, b) => b.odds - a.odds)
  const low = 1.9
  const high = 2.6
  const at = (odds: number) => ((odds - low) / (high - low)) * 100
  const fairAt = at(threeBook.fairOdds)

  return (
    <Tile
      className="lg:col-span-4"
      title="Visų kontorų kainos šalia"
      body="Matai ne tik kontorą su verte, bet ir kiek už tą patį statymą moka kitos. Turi kelias paskyras? Statai ten, kur kaina geriausia."
    >
      <div className="rounded-xl bg-night/60 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{threeBook.prices[0].event}</p>
          <p className="text-[0.9rem] text-haze">
            {threeBook.market}: {threeBook.prices[0].selection}
          </p>
        </div>
        <div className="mt-5 space-y-3">
          {prices.map((price) => {
            const edge = edgeOf(price.odds, threeBook.fairOdds)
            const clears = edge > 0
            return (
              <div
                key={price.book}
                className="grid grid-cols-[auto_4.75rem_1fr_3rem] items-center gap-2 sm:grid-cols-[auto_5.5rem_1fr_3.5rem_4rem] sm:gap-3"
              >
                <BookMark book={price.book} size="sm" />
                <span className="text-[0.95rem]">{price.book}</span>
                <span aria-hidden className="relative h-3 rounded-full bg-rail">
                  <span
                    className="absolute inset-y-0 left-0 rounded-l-full bg-haze-dim"
                    style={{ width: `${Math.min(at(price.odds), fairAt)}%` }}
                  />
                  {clears && (
                    <motion.span
                      initial={{ width: 0 }}
                      whileInView={{ width: `${at(price.odds) - fairAt}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: EASE }}
                      className="absolute inset-y-0 rounded-r-full bg-floodlight"
                      style={{ left: `${fairAt}%` }}
                    />
                  )}
                  <span className="absolute -inset-y-1.5 w-0.5 rounded bg-chalk" style={{ left: `calc(${fairAt}% - 1px)` }} />
                </span>
                <span className={`text-right font-display text-xl font-bold tnum ${clears ? 'text-floodlight' : ''}`}>
                  {formatOdds(price.odds)}
                </span>
                <span
                  className={`hidden text-right text-[0.9rem] sm:block ${clears ? 'font-semibold text-floodlight' : 'text-haze-dim'}`}
                >
                  {formatEdge(edge)}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-4 text-[0.85rem] text-haze">
          Balta linija: tikroji kaina {formatOdds(threeBook.fairOdds)}. Pinnacle su marža siūlo{' '}
          {formatOdds(threeBook.pinnacleOdds)}.
        </p>
      </div>
    </Tile>
  )
}

function FilterTile() {
  const [enabled, setEnabled] = useState<Set<BookName>>(() => new Set(['7BET', 'Betsson']))
  const shown = landingSignals.filter((signal) => enabled.has(signal.valueBook)).length

  return (
    <Tile
      className="lg:col-span-2"
      title="Tik tavo kontoros"
      body="Neturi TopSport paskyros? Išjunk ir jos signalų nebematysi."
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Kontoros">
        {BOOKS.map((book) => {
          const on = enabled.has(book)
          return (
            <button
              key={book}
              type="button"
              aria-pressed={on}
              onClick={() =>
                setEnabled((current) => {
                  const next = new Set(current)
                  if (next.has(book) && next.size > 1) next.delete(book)
                  else next.add(book)
                  return next
                })
              }
              className={`inline-flex items-center gap-2 rounded-full py-1 pr-3.5 pl-1 font-medium transition-[background-color,color,opacity] duration-200 ${
                on ? 'bg-rail text-chalk' : 'text-haze-dim opacity-70 hover:opacity-100'
              }`}
            >
              <BookMark book={book} size="sm" />
              {book}
            </button>
          )
        })}
      </div>
      <p className="mt-8 font-display text-6xl font-bold tnum">
        <NumberFlow value={shown} locales="lt-LT" />
        <span className="ml-2 font-sans text-base font-normal text-haze">
          {ltPlural(shown, 'signalas', 'signalai', 'signalų')} iš {landingSignals.length}
        </span>
      </p>
    </Tile>
  )
}

function CopyNameTile() {
  return (
    <Tile
      className="lg:col-span-3"
      title="Pavadinimas, kurį kontora supras"
      body="Tos pačios rungtynės kiekvienoje kontoroje parašytos kitaip. Kopijuojam tiksliai taip, kaip rašo tavo kontora, ir įklijuoji paieškoje."
    >
      <ul className="divide-y divide-rail rounded-xl bg-night/60">
        {threeBook.prices.map((price) => (
          <li key={price.book} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex min-w-0 items-center gap-3">
              <BookMark book={price.book} size="sm" />
              <span className="min-w-0">
                <span className="block text-[0.8rem] text-haze">{price.book}</span>
                <span className="block truncate font-medium">{price.event}</span>
              </span>
            </span>
            <CopyButton text={price.event} label={`${price.book}: ${price.event}`} />
          </li>
        ))}
      </ul>
    </Tile>
  )
}

const LIMITS = [50, 100, 250] as const

function LimitTile() {
  const kelly = 250
  const odds = 1.95
  const [limit, setLimit] = useState<number>(50)
  const [stake, setStake] = useState<number>(50)
  const cap = Math.min(kelly, limit)
  const clampedStake = Math.min(stake, cap)

  return (
    <Tile
      className="lg:col-span-3"
      title="Limitas mažesnis už Kelly?"
      body="Kelly siūlo 250 €, o kontora leidžia tik 50 €. Įrašyk limitą vieną kartą ir siūloma suma jo niekada neviršys. Sumą keiti pats."
    >
      <div className="rounded-xl bg-night/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.9rem] text-haze">Kontoros limitas</p>
          <div className="flex gap-1.5" role="group" aria-label="Kontoros limitas">
            {LIMITS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={limit === value}
                onClick={() => {
                  setLimit(value)
                  setStake(Math.min(kelly, value))
                }}
                className={`rounded-lg px-3 py-1.5 text-[0.9rem] font-medium tnum transition-colors ${
                  limit === value ? 'bg-chalk text-night' : 'bg-rail text-haze hover:text-chalk'
                }`}
              >
                {value} €
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            aria-label="Mažinti sumą 5 €"
            onClick={() => setStake((value) => Math.max(5, Math.min(value, cap) - 5))}
            className="grid size-12 place-items-center rounded-xl bg-rail transition-colors hover:bg-rail-strong active:scale-95"
          >
            <Minus className="size-5" aria-hidden />
          </button>
          <div className="text-center">
            <p className="font-display text-5xl font-bold tnum">
              <NumberFlow value={clampedStake} locales="lt-LT" suffix=" €" />
            </p>
            <p className="mt-1 text-[0.85rem] text-haze">
              Kelly {kelly} €, ribojama iki {cap} €
            </p>
          </div>
          <button
            type="button"
            aria-label="Didinti sumą 5 €"
            disabled={clampedStake >= cap}
            onClick={() => setStake((value) => Math.min(cap, value + 5))}
            className="grid size-12 place-items-center rounded-xl bg-rail transition-colors hover:bg-rail-strong active:scale-95 disabled:opacity-40"
          >
            <Plus className="size-5" aria-hidden />
          </button>
        </div>

        <div className="mt-5 flex justify-between border-t border-rail pt-4 text-[0.95rem]">
          <span className="text-haze">Galimas laimėjimas, koef. 1,95</span>
          <span className="font-semibold tnum">
            <NumberFlow value={clampedStake * (odds - 1)} format={{ maximumFractionDigits: 2 }} locales="lt-LT" suffix=" €" />
          </span>
        </div>
      </div>
    </Tile>
  )
}

type LedgerEntry = { id: number; label: string; amount: number }

function BankrollTile() {
  const [entries, setEntries] = useState<LedgerEntry[]>([{ id: 0, label: 'Pradinis', amount: 500 }])
  const balance = entries.reduce((sum, entry) => sum + entry.amount, 0)
  // Quarter Kelly for the Betsson 1.95 vs fair 1.845 signal: 1.5 % of bankroll.
  const stakeShare = Math.min(0.05, ((0.95 * (1 / 1.845) - (1 - 1 / 1.845)) / 0.95) * 0.25)

  function add(amount: number) {
    setEntries((current) => {
      if (balance + amount < 100) return current
      const id = (current.at(-1)?.id ?? 0) + 1
      return [...current, { id, label: amount > 0 ? 'Įnešta' : 'Išimta', amount }].slice(-4)
    })
  }

  return (
    <Tile
      className="lg:col-span-2"
      title="Bankrollas keičiasi kartu su tavimi"
      body="Įnešei ar išsiėmei? Pažymi, ir visos siūlomos sumos persiskaičiuoja."
    >
      <p className="font-display text-5xl font-bold tnum">
        <NumberFlow value={balance} locales="lt-LT" suffix=" €" />
      </p>
      <p className="mt-1 text-[0.9rem] text-haze">
        Siūloma suma dabar{' '}
        <span className="font-semibold text-chalk tnum">
          <NumberFlow value={Math.round(balance * stakeShare)} locales="lt-LT" suffix=" €" />
        </span>
      </p>
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => add(100)}
          className="flex-1 rounded-lg bg-rail px-3 py-2 text-[0.9rem] font-medium transition-colors hover:bg-rail-strong active:scale-[0.97]"
        >
          Įnešti 100 €
        </button>
        <button
          type="button"
          onClick={() => add(-100)}
          className="flex-1 rounded-lg bg-rail px-3 py-2 text-[0.9rem] font-medium transition-colors hover:bg-rail-strong active:scale-[0.97]"
        >
          Išimti 100 €
        </button>
      </div>
      <ul className="mt-4 space-y-1.5 text-[0.9rem]">
        <AnimatePresence initial={false}>
          {[...entries].reverse().slice(0, 3).map((entry) => (
            <motion.li
              key={entry.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex justify-between"
            >
              <span className="text-haze">{entry.label}</span>
              <span className="tnum">
                {entry.amount > 0 && entry.id > 0 ? '+' : ''}
                {entry.amount.toLocaleString('lt-LT')} €
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Tile>
  )
}

function ClosedTile() {
  const [closed, setClosed] = useState(false)
  const price = vefTotal.prices[0]
  const edge = edgeOf(price.odds, vefTotal.fairOdds)

  return (
    <Tile
      className="lg:col-span-2"
      title="Kai kaina pasikeičia"
      body="Kontora pataisė koeficientą? Signalas iškart pažymimas užsidariusiu, kad nestatytum be vertės."
    >
      <div className="rounded-xl bg-night/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-medium">{price.event}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={closed ? 'closed' : 'open'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={`font-display text-2xl font-bold tnum ${closed ? 'text-haze-dim line-through' : 'text-floodlight'}`}
            >
              {formatEdge(edge)}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="mt-1 text-[0.9rem] text-haze">
          {vefTotal.market}: {price.selection}, {price.book} {formatOdds(price.odds)}
        </p>
        <AnimatePresence initial={false}>
          {closed && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex items-center gap-2 overflow-hidden pt-3 text-[0.9rem] text-chalk"
            >
              <Clock className="size-4 text-haze" aria-hidden />
              Vertė užsidarė. Paskutinį kartą matyta 13:36.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => setClosed((value) => !value)}
        className="mt-4 w-full rounded-lg bg-rail px-3 py-2 text-[0.9rem] font-medium transition-colors hover:bg-rail-strong active:scale-[0.97]"
      >
        {closed ? 'Grąžinti' : 'Atnaujinti kainas'}
      </button>
    </Tile>
  )
}

function TelegramTile() {
  const price = vefTotal.prices[0]
  return (
    <Tile
      className="lg:col-span-2"
      title="Signalai į Telegram"
      body="Pasirinki mažiausią vertę, kontoras ir tylos valandas. Pranešimas ateina su visais skaičiais."
    >
      <div className="rounded-xl bg-night/60 p-4">
        <div className="flex items-center gap-2 text-[0.85rem] text-haze">
          <Send className="size-4" aria-hidden />
          Naujas signalas
        </div>
        <p className="mt-2 font-medium">{price.event}</p>
        <p className="text-[0.9rem] text-haze">
          {vefTotal.market}: {price.selection}
        </p>
        <p className="mt-2 text-[0.95rem] tnum">
          {price.book} {formatOdds(price.odds)},{' '}
          <span className="font-semibold text-floodlight">{formatEdge(edgeOf(price.odds, vefTotal.fairOdds))}</span>
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-[0.85rem]">
        {['Nuo 2 %', 'Per 24 val.', 'Tyla 00:00–08:00'].map((chip) => (
          <span key={chip} className="rounded-full bg-rail px-3 py-1 text-haze">
            {chip}
          </span>
        ))}
      </div>
    </Tile>
  )
}
