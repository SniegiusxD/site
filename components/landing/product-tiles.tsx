'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Clock, Copy } from 'lucide-react'
import { useState } from 'react'
import { edgeOf, formatEdge, formatOdds, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName, landingSignals } from '@/lib/landing-signals'
import type { PublicStats } from '@/lib/public-stats'
import { BookMark } from './book-mark'
import { Reveal, useInViewOnce } from './motion-primitives'

const EASE = [0.22, 1, 0.36, 1] as const

// Real captured signals: all three books priced, and a Betsson total for the stake demo.
const threeBook = landingSignals.find((signal) => signal.id === 'breogan-rilski-hcp-home')!
const betsson = landingSignals.find((signal) => signal.id === 'vef-absheron-total-171')!

const CARD = 'group flex h-full min-w-0 flex-col rounded-[20px] bg-stand p-[clamp(20px,2.6vw,28px)] shadow-[inset_0_0_0_1px_var(--rail-strong)] transition-transform duration-150 hover:-translate-y-0.5'
const H3 = 'text-[clamp(1.375rem,2vw,1.75rem)] tracking-[-0.02em]'
const BODY = 'mt-2.5 text-[0.9375rem] text-haze'

export function ProductTiles({ stats }: { stats: PublicStats | null }) {
  return (
    <section id="viduje" className="scroll-mt-16 bg-night px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div className="mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95]">Kas laukia viduje</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-5 max-w-[60ch] text-[clamp(1.05rem,1.4vw,1.25rem)] text-haze">Visa tai veikia ir čia. Spaudinėk.</p>
        </Reveal>
        {/* Six tiles, one wide per row on desktop, alternating sides: 2+1, 1+2,
            2+1. On tablets the two wide ones take a row each and the rest pair up,
            so no row ends with a gap. */}
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
            <TelegramTile />
          </Reveal>
          <Reveal variant="scale" delay={60} className="lg:col-span-2">
            <ClosedTile />
          </Reveal>
          <Reveal variant="scale" delay={120}>
            <BankrollTile />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/**
 * One selection, every book's price read against the true price. The true price
 * is the zero line in the middle: a bar to the right means the book pays more
 * than the bet is worth, to the left less. Bar lengths are the percentage
 * difference itself, so no arbitrary axis minimum can make a small gap look
 * large, and every row also says its odds and difference in words.
 */
function PricesTile() {
  const [ref, seen] = useInViewOnce<HTMLDivElement>()
  const prices = BOOKS.map((book) => threeBook.prices.find((price) => price.book === book)!).filter(Boolean)
  const sorted = [...prices].sort((a, b) => b.odds - a.odds)
  const event = threeBook.prices.find((price) => price.book === threeBook.valueBook)!
  const fair = threeBook.fairOdds
  const deltas = sorted.map((price) => price.odds / fair - 1)
  // The widest difference reaches most of a half-track, never the edge.
  const span = Math.max(0.03, ...deltas.map(Math.abs)) * 1.15
  const best = sorted[0]

  return (
    <article className={CARD}>
      <h3 className={H3}>Visų kontorų kainos prie kiekvieno signalo</h3>
      <p className={BODY}>Matai ne tik geriausią kainą, o visą eilę ir tikrąją kainą tarp jų. Turi kelias paskyras? Statai ten, kur moka daugiausia.</p>
      <p className="mt-4 text-[0.875rem]">
        {event.event} <span className="text-haze">· {threeBook.market}: {event.selection}</span>
      </p>

      <div ref={ref} className="mt-5 grid gap-2.5">
        <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_6.25rem] items-end gap-3 text-[0.8125rem] text-haze-dim">
          <span>Kontora</span>
          {/* On a phone the track is too narrow for three labels; the true
              price, which the whole reading hangs on, is the one that stays. */}
          <span className="flex justify-center sm:justify-between">
            <span className="hidden sm:inline">moka mažiau</span>
            <span className="whitespace-nowrap text-chalk">tikroji {formatOdds(fair)}</span>
            <span className="hidden sm:inline">moka daugiau</span>
          </span>
          <span className="hidden text-right whitespace-nowrap sm:inline">Koef., skirtumas</span>
        </div>

        {sorted.map((price, index) => {
          const delta = deltas[index]
          const value = delta > 0
          const reach = `${Math.min(Math.abs(delta) / span, 1) * 50}%`
          return (
            <div key={price.book} className="grid grid-cols-[5.25rem_minmax(0,1fr)_6.25rem] items-center gap-3">
              <span className="min-w-0">
                <span className="block truncate text-[0.875rem]">{price.book}</span>
                {price === best && value && <span className="block text-[0.75rem] text-floodlight">geriausia kaina</span>}
              </span>
              <div className="relative h-9 rounded-[10px] bg-night-deep" aria-hidden>
                <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 border-l border-dashed border-chalk/70" />
                <span
                  className={`absolute inset-y-2 ${value ? 'left-1/2 rounded-r-md bg-floodlight' : 'right-1/2 rounded-l-md bg-steel'}`}
                  style={{
                    width: seen ? reach : '0%',
                    transition: `width 800ms cubic-bezier(0.22,1,0.36,1) ${index * 90}ms`,
                  }}
                />
              </div>
              <span className="text-right tnum">
                <span className={`font-display text-[1.05rem] font-bold ${value ? 'text-floodlight' : 'text-chalk'}`}>
                  {formatOdds(price.odds)}
                </span>{' '}
                <span className={`text-[0.8125rem] font-semibold ${value ? 'text-floodlight' : 'text-haze'}`}>
                  <NumberFlow
                    value={seen ? delta : 0}
                    locales="lt-LT"
                    format={{ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }}
                  />
                </span>
              </span>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-[0.875rem] text-haze">
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
              className={`inline-flex min-h-11 items-center gap-2 rounded-full py-1 pr-4 pl-1.5 text-[0.875rem] font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.97] ${
                on ? 'bg-chalk text-night' : 'text-haze shadow-[inset_0_0_0_1px_var(--rail-strong)] hover:text-chalk'
              }`}
            >
              <BookMark book={book} size="sm" />
              {book}
            </button>
          )
        })}
      </div>
      <div className="mt-auto pt-6">
        <p className="font-display text-[2.25rem] leading-none font-extrabold tracking-[-0.03em]">
          <NumberFlow value={count} locales="lt-LT" />
        </p>
        <p className="mt-1 text-[0.8125rem] text-haze">
          {stats ? `${ltPlural(count, 'signalas', 'signalai', 'signalų')} per parą su tokiu pasirinkimu` : 'pavyzdiniai signalai su tokiu pasirinkimu'}
        </p>
        <div aria-hidden className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full">
          {BOOKS.map((book) => (
            <span
              key={book}
              className={`h-2 rounded-full transition-[flex-grow,opacity] duration-500 ${enabled.has(book) ? 'bg-floodlight' : 'bg-rail'}`}
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
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[14px] bg-night-deep px-3.5 py-3 text-left transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="text-[0.75rem] text-haze">{price.book}</span>
              <span className="truncate text-[0.875rem]">{price.event}</span>
            </span>
            {copied === price.book ? (
              <Check className="size-4 shrink-0 text-floodlight" aria-hidden />
            ) : (
              <Copy className="size-4 shrink-0 text-haze" aria-hidden />
            )}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mt-auto min-h-5 pt-3 text-[0.8125rem] text-floodlight">
        {copied ? `Nukopijuota ${copied} rašyba` : ''}
      </p>
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
            className="min-h-11 flex-1 rounded-[14px] bg-rail px-3 text-[0.875rem] font-medium transition-[transform,background-color] hover:bg-rail-strong active:scale-[0.97]"
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
                <span className="truncate text-haze">{entry.label}</span>
                <span className={`font-semibold tnum ${entry.id === 0 ? '' : entry.amount > 0 ? 'text-floodlight' : 'text-brick'}`}>
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
                active ? 'bg-floodlight-soft text-floodlight shadow-[inset_0_0_0_1px_var(--floodlight)]' : 'text-haze shadow-[inset_0_0_0_1px_var(--rail)] hover:text-chalk'
              }`}
            >
              {filter}
            </button>
          )
        })}
      </div>
      <p className="mt-auto pt-5 text-[0.8125rem] text-haze">
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
      <div className="mt-5 rounded-[14px] bg-night-deep p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-[0.9375rem] font-medium">{price.event}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={closed ? 'closed' : 'open'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className={`font-display text-[1.375rem] font-bold tnum ${closed ? 'text-haze line-through' : 'text-floodlight'}`}
            >
              {formatEdge(edge)}
            </motion.p>
          </AnimatePresence>
        </div>
        <p className="mt-1 text-[0.8125rem] text-haze">
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
              <Clock className="size-4 text-haze" aria-hidden />
              Vertė užsidarė. Paskutinį kartą matyta 13:36.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={() => setClosed((value) => !value)}
        className="mt-auto min-h-11 w-full rounded-[14px] bg-rail px-3 text-[0.875rem] font-medium transition-[transform,background-color] hover:bg-rail-strong active:scale-[0.97] [margin-top:max(1rem,auto)]"
      >
        {closed ? 'Grąžinti' : 'Atnaujinti kainas'}
      </button>
    </article>
  )
}
