'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clock, Copy, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { edgeOf, formatEdge, formatOdds, kellyFraction, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName, landingSignals } from '@/lib/landing-signals'
import type { PublicStats } from '@/lib/public-stats'
import { Reveal, useInViewOnce } from './motion-primitives'

const EASE = [0.22, 1, 0.36, 1] as const

// Real captured signals: all three books priced, and a Betsson total for the stake demo.
const threeBook = landingSignals.find((signal) => signal.id === 'breogan-rilski-hcp-home')!
const betsson = landingSignals.find((signal) => signal.id === 'vef-absheron-total-171')!

const CARD = 'group flex h-full min-w-0 flex-col rounded-[20px] bg-white p-[clamp(20px,2.6vw,28px)] text-ink shadow-[0_1px_2px_rgb(11_31_23/0.06),inset_0_0_0_1px_rgb(11_31_23/0.08)] transition-transform duration-150 hover:-translate-y-0.5'
const H3 = 'text-[clamp(1.375rem,2vw,1.75rem)] tracking-[-0.02em] text-ink'
const BODY = 'mt-2.5 text-[0.9375rem] text-moss'

export function ProductTiles({ stats }: { stats: PublicStats | null }) {
  return (
    <section id="viduje" className="scroll-mt-16 bg-cream px-5 py-[clamp(80px,10vw,160px)] text-ink sm:px-8">
      <div className="mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] text-ink">Kas laukia viduje</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-5 max-w-[60ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-moss">Visa tai veikia ir čia. Spaudinėk.</p>
        </Reveal>
        <div className="mt-[clamp(40px,5vw,72px)] grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Reveal variant="scale" className="md:col-span-2">
            <PricesTile />
          </Reveal>
          <Reveal variant="scale" delay={60}>
            <MyBooksTile stats={stats} />
          </Reveal>
          <Reveal variant="scale" delay={120}>
            <CopyTile />
          </Reveal>
          <Reveal variant="scale" delay={180} className="md:col-span-2">
            <LimitTile />
          </Reveal>
          <Reveal variant="scale" delay={60}>
            <BankrollTile />
          </Reveal>
          <Reveal variant="scale" delay={120}>
            <TelegramTile />
          </Reveal>
          <Reveal variant="scale" delay={180} className="md:col-span-2 lg:col-span-1">
            <ClosedTile />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/**
 * One selection, every book's price on one axis, with the true price marked.
 * A bar past the mark is value: that reading needs no toggle and no legend.
 */
function PricesTile() {
  const [ref, seen] = useInViewOnce<HTMLDivElement>()
  const prices = BOOKS.map((book) => threeBook.prices.find((price) => price.book === book)!).filter(Boolean)
  const sorted = [...prices].sort((a, b) => b.odds - a.odds)
  const event = threeBook.prices.find((price) => price.book === threeBook.valueBook)!
  const fair = threeBook.fairOdds

  // The axis starts below the cheapest price and ends above the dearest, so the
  // true price always sits inside the frame with room on both sides.
  const low = Math.min(fair, ...prices.map((price) => price.odds)) * 0.94
  const high = Math.max(fair, ...prices.map((price) => price.odds)) * 1.03
  const at = (odds: number) => ((odds - low) / (high - low)) * 100

  return (
    <article className={CARD}>
      <h3 className={H3}>Visų kontorų kainos prie kiekvieno signalo</h3>
      <p className={BODY}>Matai ne tik geriausią kainą, o visą eilę ir tikrąją kainą tarp jų. Turi kelias paskyras? Statai ten, kur moka daugiausia.</p>
      <p className="mt-4 text-[0.875rem]">
        {event.event} <span className="text-moss">· {threeBook.market}: {event.selection}</span>
      </p>

      <div ref={ref} className="relative mt-5 grid flex-1 content-start gap-2.5">
        {/* The true price: everything in this card is read against this line. */}
        <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${at(fair)}%` }} aria-hidden>
          <div className="h-full w-px border-l border-dashed border-ink/40" />
        </div>

        {sorted.map((price, index) => {
          const delta = price.odds / fair - 1
          const value = delta > 0
          return (
            <div key={price.book} className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
              <span className="truncate text-[0.875rem] text-moss">{price.book}</span>
              <div className="relative h-11 rounded-[10px] bg-ink/[0.06]">
                <div
                  className={`absolute inset-y-0 left-0 rounded-[10px] ${value ? 'bg-field/12 shadow-[inset_0_0_0_1px_var(--field)]' : 'bg-ink/[0.08]/45'}`}
                  style={{
                    width: seen ? `${at(price.odds)}%` : '0%',
                    transition: `width 900ms cubic-bezier(0.22,1,0.36,1) ${index * 90}ms`,
                  }}
                />
                <div className="relative flex h-full items-center justify-between gap-2 px-3">
                  <span className="font-display text-[1.05rem] font-bold text-ink tnum">
                    {formatOdds(price.odds)}
                  </span>
                  <span className={`text-[0.8125rem] font-semibold tnum ${value ? 'text-field' : 'text-moss'}`}>
                    <NumberFlow
                      value={seen ? delta : 0}
                      locales="lt-LT"
                      format={{ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }}
                    />
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
          <span className="text-[0.875rem] text-moss">Tikroji</span>
          <div className="relative h-5">
            <span
              className="absolute top-0 -translate-x-1/2 text-[0.8125rem] whitespace-nowrap text-ink tnum"
              style={{ left: `${at(fair)}%` }}
            >
              {formatOdds(fair)}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[0.875rem] text-moss">
        Tikroji kaina — Pinnacle kaina be maržos. Pinnacle šitą siūlo už {formatOdds(threeBook.pinnacleOdds)}; išėmus maržą lieka {formatOdds(fair)}.
        Kas moka daugiau, tas moka per daug.
      </p>
    </article>
  )
}

function MyBooksTile({ stats }: { stats: PublicStats | null }) {
  const [enabled, setEnabled] = useState<Set<BookName>>(() => new Set(BOOKS))
  const perBook = (book: BookName) => stats?.perBook[book] ?? landingSignals.filter((signal) => signal.valueBook === book).length
  const count = [...enabled].reduce((sum, book) => sum + perBook(book), 0)
  const total = BOOKS.reduce((sum, book) => sum + perBook(book), 0) || 1

  return (
    <article className={CARD}>
      <h3 className={H3}>Tik tavo kontoros</h3>
      <p className={BODY}>Įjunk tas, kuriose turi paskyrą. Kitų signalų nebematysi.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Kontoros">
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
              className={`min-h-11 rounded-full px-[15px] text-[0.875rem] font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${
                on ? 'bg-ink text-cream' : 'text-moss shadow-[inset_0_0_0_1px_rgb(11_31_23/0.16)] hover:text-ink'
              }`}
            >
              {book}
            </button>
          )
        })}
      </div>
      <div className="mt-auto pt-6">
        <p className="font-display text-[2.25rem] leading-none font-extrabold tracking-[-0.03em]">
          <NumberFlow value={count} locales="lt-LT" />
        </p>
        <p className="mt-1 text-[0.8125rem] text-moss">
          {stats ? `${ltPlural(count, 'signalas', 'signalai', 'signalų')} per parą su tokiu pasirinkimu` : 'pavyzdiniai signalai su tokiu pasirinkimu'}
        </p>
        <div aria-hidden className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full">
          {BOOKS.map((book) => (
            <span
              key={book}
              className={`h-2 rounded-full transition-[flex-grow,opacity] duration-500 ${enabled.has(book) ? 'bg-field' : 'bg-ink/[0.08]'}`}
              style={{ flexGrow: perBook(book) / total }}
            />
          ))}
        </div>
      </div>
    </article>
  )
}

function CopyTile() {
  const [copied, setCopied] = useState<BookName | null>(null)
  return (
    <article className={CARD}>
      <h3 className={H3}>Kopijuojamas pavadinimas</h3>
      <p className={BODY}>Tas pats mačas kiekvienoje kontoroje parašytas kitaip. Paspaudi, ir nukopijuota taip, kaip rašo tavo kontora.</p>
      <div className="mt-5 grid gap-2">
        {threeBook.prices.map((price) => (
          <button
            key={price.book}
            type="button"
            onClick={() => {
              const done = () => {
                setCopied(price.book)
                window.setTimeout(() => setCopied((current) => (current === price.book ? null : current)), 2200)
              }
              if (navigator.clipboard) navigator.clipboard.writeText(price.event).then(done, done)
              else done()
            }}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[14px] bg-ink/[0.05] px-3.5 py-3 text-left transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="text-[0.75rem] text-moss">{price.book}</span>
              <span className="truncate text-[0.875rem]">{price.event}</span>
            </span>
            {copied === price.book ? (
              <Check className="size-4 shrink-0 text-field" aria-hidden />
            ) : (
              <Copy className="size-4 shrink-0 text-moss" aria-hidden />
            )}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-auto min-h-5 pt-3 text-[0.8125rem] text-field">
        {copied ? `Nukopijuota ${copied} rašyba` : ''}
      </p>
    </article>
  )
}

function Stepper({ label, value, onDown, onUp }: { label: string; value: string; onDown: () => void; onUp: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[0.875rem] text-moss">{label}</span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDown}
          aria-label={`Mažinti: ${label.toLowerCase()}`}
          className="grid size-11 place-items-center rounded-[14px] shadow-[inset_0_0_0_1px_rgb(11_31_23/0.16)] transition-transform hover:bg-ink/[0.06] active:scale-95"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <span className="min-w-[88px] text-right font-display text-[1.125rem] font-bold tnum">{value}</span>
        <button
          type="button"
          onClick={onUp}
          aria-label={`Didinti: ${label.toLowerCase()}`}
          className="grid size-11 place-items-center rounded-[14px] shadow-[inset_0_0_0_1px_rgb(11_31_23/0.16)] transition-transform hover:bg-ink/[0.06] active:scale-95"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </span>
    </div>
  )
}

function LimitTile() {
  const [bankroll, setBankroll] = useState(500)
  const [limit, setLimit] = useState(40)
  const price = betsson.prices.find((item) => item.book === betsson.valueBook)!
  const kelly = bankroll * Math.min(0.05, kellyFraction(price.odds, 1 / betsson.fairOdds) * 0.25)
  const stake = Math.min(kelly, limit)
  const capped = stake < kelly - 0.005
  const scale = Math.max(kelly, limit) * 1.15

  return (
    <article className={CARD}>
      <h3 className={H3}>Limitas mažesnis už Kelly?</h3>
      <p className={BODY}>
        Siūlom ketvirtį Kelly, ne daugiau 5 % bankrollo ir ne daugiau tavo limito. Pavyzdys: {price.book} {formatOdds(price.odds)}, vertė{' '}
        {formatEdge(edgeOf(price.odds, betsson.fairOdds))}.
      </p>
      <div className="mt-5 grid gap-3">
        <Stepper
          label="Bankrollas"
          value={`${bankroll.toLocaleString('lt-LT')} €`}
          onDown={() => setBankroll((value) => Math.max(100, value - 100))}
          onUp={() => setBankroll((value) => Math.min(20000, value + 100))}
        />
        <Stepper
          label="Kontoros limitas"
          value={`${limit} €`}
          onDown={() => setLimit((value) => Math.max(10, value - 10))}
          onUp={() => setLimit((value) => Math.min(1000, value + 10))}
        />
      </div>
      <div aria-hidden className="mt-5">
        <div className="relative h-3 rounded-full bg-ink/[0.06]">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-ink/25 transition-[width] duration-500"
            style={{ width: `${Math.min(100, (kelly / scale) * 100)}%` }}
          />
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-field transition-[width] duration-500"
            style={{ width: `${Math.min(100, (stake / scale) * 100)}%` }}
          />
          <span className="absolute -inset-y-1 w-0.5 bg-ink transition-[left] duration-500" style={{ left: `${Math.min(100, (limit / scale) * 100)}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-[0.8125rem] text-moss">
          <span>Siūloma suma</span>
          <span>Pilnas ketvirtis Kelly {kelly.toFixed(2).replace('.', ',')} €</span>
          <span>Limitas {limit} €</span>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-2.5 border-t border-ink/10 pt-3.5">
        <span className={`text-[0.875rem] ${capped ? 'text-field' : 'text-moss'}`}>
          {capped ? 'Apkirpta pagal kontoros limitą' : `Ketvirtis Kelly, ${((stake / bankroll) * 100).toFixed(2).replace('.', ',')} % bankrollo`}
        </span>
        <span className="font-display text-[1.75rem] font-extrabold tracking-[-0.03em]">
          <NumberFlow value={stake} locales="lt-LT" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} suffix=" €" />
        </span>
      </div>
    </article>
  )
}

type LedgerEntry = { id: number; label: string; amount: number }

function BankrollTile() {
  const [entries, setEntries] = useState<LedgerEntry[]>([
    { id: 0, label: 'Pradinis', amount: 500 },
    { id: 1, label: 'Laimėta, Betsson 1,95', amount: 9.5 },
  ])
  const balance = entries.reduce((sum, entry) => sum + entry.amount, 0)

  function add(amount: number) {
    setEntries((current) => {
      if (balance + amount < 100) return current
      const id = (current.at(-1)?.id ?? 0) + 1
      return [...current, { id, label: amount > 0 ? 'Įnešta' : 'Išimta', amount }]
    })
  }

  return (
    <article className={CARD}>
      <h3 className={H3}>Bankrollas keičiasi su tavim</h3>
      <p className={BODY}>Įnešei, išsiėmei ar laimėjai? Visos siūlomos sumos persiskaičiuoja.</p>
      <p className="mt-4 font-display text-[2.25rem] leading-none font-extrabold tracking-[-0.03em]">
        <NumberFlow value={balance} locales="lt-LT" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} suffix=" €" />
      </p>
      <div className="mt-4 flex gap-2">
        {[100, -100].map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => add(amount)}
            className="min-h-11 flex-1 rounded-[14px] bg-ink/[0.08] px-3 text-[0.875rem] font-medium transition-[transform,background-color] hover:bg-ink/25 active:scale-[0.97]"
          >
            {amount > 0 ? 'Įnešti 100 €' : 'Išimti 100 €'}
          </button>
        ))}
      </div>
      <ul className="mt-auto space-y-1.5 pt-4 text-[0.875rem]">
        <AnimatePresence initial={false}>
          {[...entries]
            .reverse()
            .slice(0, 3)
            .map((entry) => (
              <motion.li
                key={entry.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex justify-between gap-3"
              >
                <span className="truncate text-moss">{entry.label}</span>
                <span className={`font-semibold tnum ${entry.id === 0 ? '' : entry.amount > 0 ? 'text-field' : 'text-coral'}`}>
                  {entry.id > 0 && entry.amount > 0 ? '+' : ''}
                  {entry.amount.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </motion.li>
            ))}
        </AnimatePresence>
      </ul>
    </article>
  )
}

const FILTERS = ['Vertė 2 %+', 'Krepšinis', 'Tenisas', 'Suminis', 'Koef. iki 2,00', 'Visos rungtynės', 'Tik 7BET', 'Tyla 00–08']

function TelegramTile() {
  const [on, setOn] = useState<Set<string>>(() => new Set(['Nuo +2 %', 'Krepšinis']))
  return (
    <article className={CARD}>
      <h3 className={H3}>Signalai į Telegram</h3>
      <p className={BODY}>Filtruoji pagal sportą, rinką, periodą, koeficientą, vertę, kontorą ir laiką iki rungtynių. Kas netinka, neateina.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Pranešimų filtrai">
        {FILTERS.map((filter) => {
          const active = on.has(filter)
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={active}
              onClick={() =>
                setOn((current) => {
                  const next = new Set(current)
                  if (next.has(filter)) next.delete(filter)
                  else next.add(filter)
                  return next
                })
              }
              className={`min-h-11 rounded-full px-3.5 text-[0.8125rem] font-medium transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${
                active ? 'bg-field/10 text-field shadow-[inset_0_0_0_1px_var(--field)]' : 'text-moss shadow-[inset_0_0_0_1px_rgb(11_31_23/0.16)] hover:text-ink'
              }`}
            >
              {filter}
            </button>
          )
        })}
      </div>
      <p className="mt-auto pt-5 text-[0.8125rem] text-moss">
        Įjungta {on.size} iš {FILTERS.length}. Visus filtrus nustatai profilyje, kada nori.
      </p>
    </article>
  )
}

function ClosedTile() {
  const [closed, setClosed] = useState(false)
  const price = betsson.prices.find((item) => item.book === betsson.valueBook)!
  const edge = edgeOf(price.odds, betsson.fairOdds)

  return (
    <article className={CARD}>
      <h3 className={H3}>Kai kaina pasikeičia</h3>
      <p className={BODY}>Kontora pataisė koeficientą? Signalas iškart pažymimas užsidariusiu, kad nestatytum be vertės.</p>
      <div className="mt-5 rounded-[14px] bg-ink/[0.05] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[0.9375rem] font-medium">{price.event}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={closed ? 'closed' : 'open'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={`font-display text-[1.375rem] font-bold tnum ${closed ? 'text-moss line-through' : 'text-field'}`}
            >
              {formatEdge(edge)}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="mt-1 text-[0.8125rem] text-moss">
          {betsson.market}: {price.selection}, {price.book} {formatOdds(price.odds)}
        </p>
        <AnimatePresence initial={false}>
          {closed && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="flex items-center gap-2 overflow-hidden pt-3 text-[0.875rem]"
            >
              <Clock className="size-4 text-moss" aria-hidden />
              Vertė užsidarė. Paskutinį kartą matyta 13:36.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => setClosed((value) => !value)}
        className="mt-auto min-h-11 w-full rounded-[14px] bg-ink/[0.08] px-3 text-[0.875rem] font-medium transition-[transform,background-color] hover:bg-ink/25 active:scale-[0.97] [margin-top:max(1rem,auto)]"
      >
        {closed ? 'Grąžinti' : 'Atnaujinti kainas'}
      </button>
    </article>
  )
}
