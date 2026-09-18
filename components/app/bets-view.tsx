'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Loader2, RefreshCw, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import {
  type BetStats,
  type ClvFilter,
  type Period,
  type ValuePoint,
  betStats,
  betTime,
  closingValue,
  inPeriod,
  matchesClv,
  valueSeries,
  verdict,
} from '@/lib/bet-value'
import { executionStats } from '@/lib/execution'
import { formatEdge, formatEuro, formatOdds, formatPercent, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { kickoffLabel, ltSelection } from '@/lib/live-view'
import { OUTCOME_LABEL } from '@/lib/member-outcomes'
import { type SettledSummary, latestSettlement, settledSince } from '@/lib/since-last-visit'
import { sportName } from '@/lib/sports-lt'
import type { ActiveBet, BetStatus } from '@/lib/types'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { useAccount } from './account-provider'
import { ChipGroup } from './chip-group'
import { ProfitCalendar } from './profit-calendar'
import { Segmented } from './segmented'
import { ValueChart, signedEuro } from './value-chart'

const STATUS: Record<BetStatus, { label: string; tone: string }> = {
  laukia: { label: 'Laukia', tone: 'bg-rail text-haze' },
  laimeta: { label: 'Laimėta', tone: 'bg-pitch-soft text-pitch' },
  pralaimeta: { label: 'Pralaimėta', tone: 'bg-brick-soft text-brick' },
  grazinta: { label: 'Grąžinta', tone: 'bg-rail text-chalk' },
  neisspresta: { label: 'Neišspręsta', tone: 'bg-rail text-haze-dim' },
}

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'week', label: 'Savaitė' },
  { value: 'month', label: 'Mėnuo' },
  { value: 'all', label: 'Viskas' },
]

const CLV_CHOICES: Array<{ value: ClvFilter; label: string }> = [
  { value: 'all', label: 'Visi' },
  { value: 'plus', label: 'Įveikė uždarymo kainą' },
  { value: 'minus', label: 'Neįveikė' },
  { value: 'without', label: 'Be uždarymo kainos' },
]

type StatusTab = 'all' | 'pending' | 'settled'

// Rolling digits when the period or filters change the three numbers.
const EURO_FLOW = { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' } as const

const PAGE = 20

// Per device and account: the newest settlement this member has already seen here.
const SEEN_KEY = 'bets-seen-settled:'

const tone = (value: number) => (value > 0.004 ? 'text-pitch' : value < -0.004 ? 'text-brick' : 'text-chalk')
const timeOf = (bet: ActiveBet) => new Date(betTime(bet) ?? 0).getTime()

export function BetsView() {
  const [bets, setBets] = useState<ActiveBet[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState<Period>('month')
  const [book, setBook] = useState('')
  const [sport, setSport] = useState('')
  const [clv, setClv] = useState<ClvFilter>('all')
  const [tab, setTab] = useState<StatusTab>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const { email } = useAccount()
  const [since, setSince] = useState<SettledSummary | null>(null)
  const sinceChecked = useRef(false)

  // Once per visit: what settled since the last one, then remember the newest result as seen.
  useEffect(() => {
    if (!bets || sinceChecked.current) return
    sinceChecked.current = true
    const key = `${SEEN_KEY}${email}`
    try {
      const marker = window.localStorage.getItem(key)
      setSince(settledSince(bets, marker))
      const latest = latestSettlement(bets)
      window.localStorage.setItem(key, marker && marker > latest ? marker : latest)
    } catch {
      // Storage refused (private window): no summary this visit.
    }
  }, [bets, email])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bets', { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const body = await response.json()
      setBets(body.bets)
      setError(null)
    } catch {
      setError('Nepavyko įkelti statymų. Bandyk dar kartą.')
    } finally {
      setLoading(false)
      setNow(new Date())
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Filters scope everything below them; the calendar keeps its own month.
  const scoped = useMemo(
    () => (bets ?? []).filter((bet) => (!book || bet.bookmaker === book) && (!sport || bet.sport === sport) && matchesClv(bet, clv)),
    [bets, book, sport, clv],
  )
  const inRange = useMemo(() => scoped.filter((bet) => inPeriod(bet, period, now)), [scoped, period, now])
  const stats = useMemo(() => betStats(inRange), [inRange])
  const series = useMemo(() => valueSeries(inRange), [inRange])
  const books = useMemo(() => BOOKS.filter((name) => (bets ?? []).some((bet) => bet.bookmaker === name)), [bets])
  const sports = useMemo(() => [...new Set((bets ?? []).map((bet) => bet.sport))].sort(), [bets])
  const pending = useMemo(() => inRange.filter((bet) => bet.status === 'laukia').sort((a, b) => timeOf(a) - timeOf(b)), [inRange])
  const settled = useMemo(() => inRange.filter((bet) => bet.status !== 'laukia').sort((a, b) => timeOf(b) - timeOf(a)), [inRange])
  const activeFilters = (book ? 1 : 0) + (sport ? 1 : 0) + (clv !== 'all' ? 1 : 0)

  return (
    <main className="mx-auto max-w-[60rem] px-4 pt-6 pb-16 sm:px-8 lg:pt-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[2.4rem] sm:text-[3rem]">Statymai</h1>
        <button
          type="button"
          onClick={load}
          aria-label="Atnaujinti"
          className="grid size-10 place-items-center rounded-xl text-haze transition-colors hover:bg-stand hover:text-chalk"
        >
          <RefreshCw className={`size-5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-haze">Rezultatai suvedami automatiškai, kai rungtynės baigiasi.</p>

      {error && <p role="alert" className="mt-6 rounded-xl bg-brick-soft px-4 py-3 text-brick">{error}</p>}

      {bets === null ? (
        <div className="grid place-items-center py-24 text-haze">
          <Loader2 className="size-6 animate-spin" aria-hidden />
        </div>
      ) : bets.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-stand p-8 text-center hairline">
          <p className="font-display text-3xl font-bold">Dar nepažymėjai nė vieno statymo</p>
          <p className="mx-auto mt-3 max-w-[26rem] text-haze">
            Kai pastatysi pagal signalą, paspausk „Pastačiau“, ir statymas atsiras čia su rezultatu, verte ir uždarymo kaina.
          </p>
          <Link href="/signalai" className="mt-6 inline-block rounded-xl bg-floodlight px-5 py-3 font-semibold text-night transition-transform hover:-translate-y-0.5">
            Į signalus
          </Link>
        </div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Segmented label="Laikotarpis" options={PERIODS} value={period} onChange={setPeriod} />
            <button
              type="button"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((value) => !value)}
              className={`inline-flex h-11 items-center gap-2 rounded-xl px-3.5 font-medium transition-colors ${filtersOpen ? 'bg-chalk text-night' : 'bg-stand hairline hover:bg-stand-hover'}`}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              Filtrai
              {activeFilters > 0 && (
                <span className={`grid size-5 place-items-center rounded-full text-[0.75rem] ${filtersOpen ? 'bg-night text-chalk' : 'bg-chalk text-night'}`}>
                  {activeFilters}
                </span>
              )}
            </button>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBook('')
                  setSport('')
                  setClv('all')
                }}
                className="px-2 text-[0.95rem] text-haze underline decoration-rail-strong underline-offset-4 hover:text-chalk"
              >
                Išvalyti
              </button>
            )}
          </div>
          {filtersOpen && (
            <div className="mt-3 space-y-4 rounded-2xl bg-stand p-5 hairline">
              {books.length > 1 && (
                <ChipGroup
                  label="Kontora"
                  options={[{ value: '', label: 'Visos' }, ...books.map((name) => ({ value: name as string, label: name as string }))]}
                  value={book}
                  onChange={setBook}
                />
              )}
              {sports.length > 1 && (
                <ChipGroup
                  label="Sporto šaka"
                  options={[{ value: '', label: 'Visos' }, ...sports.map((value) => ({ value, label: sportName(value) }))]}
                  value={sport}
                  onChange={setSport}
                />
              )}
              <ChipGroup label="Uždarymo kaina" options={CLV_CHOICES} value={clv} onChange={setClv} />
            </div>
          )}

          <AnimatePresence>{since && <SinceLastVisit summary={since} onClose={() => setSince(null)} />}</AnimatePresence>
          <ThreeNumbers stats={stats} />
          <StatGrid stats={stats} bets={scoped} />
          <ValueCard series={series} stats={stats} />
          <ProfitCalendar bets={scoped} />
          <History pending={pending} settled={settled} tab={tab} onTab={setTab} />
        </div>
      )}
    </main>
  )
}

function SinceLastVisit({ summary, onClose }: { summary: SettledSummary; onClose: () => void }) {
  const reduced = useReducedMotion()
  const parts = [
    summary.won > 0 ? `${summary.won} ${ltPlural(summary.won, 'laimėtas', 'laimėti', 'laimėtų')}` : null,
    summary.lost > 0 ? `${summary.lost} ${ltPlural(summary.lost, 'pralaimėtas', 'pralaimėti', 'pralaimėtų')}` : null,
    summary.pushed > 0 ? `${summary.pushed} ${ltPlural(summary.pushed, 'grąžintas', 'grąžinti', 'grąžintų')}` : null,
  ]
    .filter(Boolean)
    .join(', ')
  return (
    <motion.section
      aria-label="Nuo paskutinio apsilankymo"
      initial={reduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stand p-4 hairline sm:px-6"
    >
      <div className="min-w-0">
        <p className="font-medium">
          Nuo paskutinio apsilankymo užsibaigė {summary.count} {ltPlural(summary.count, 'statymas', 'statymai', 'statymų')}
        </p>
        <p className="mt-0.5 text-[0.9rem] text-haze">{parts}</p>
      </div>
      <div className="flex items-center gap-4">
        <p className={`font-display text-[1.8rem] leading-none font-bold tnum ${tone(summary.profit)}`}>{signedEuro(summary.profit)}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl bg-rail px-3.5 py-2 font-medium transition-colors hover:bg-rail-strong"
        >
          Gerai
        </button>
      </div>
    </motion.section>
  )
}

function ThreeNumbers({ stats }: { stats: BetStats }) {
  return (
    <section aria-label="Rezultatas, vertė ir sėkmė" className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-7">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-[minmax(0,1.5fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[0.9rem] text-haze">Rezultatas</p>
          <p className={`mt-1 font-display text-[3.4rem] leading-none font-bold ${tone(stats.profit)}`}>
            <NumberFlow value={stats.profit} locales="lt-LT" format={EURO_FLOW} suffix=" €" />
          </p>
          <p className="mt-2 text-[0.85rem] text-haze">
            {stats.settled} {ltPlural(stats.settled, 'užbaigtas statymas', 'užbaigti statymai', 'užbaigtų statymų')}
            {stats.pending > 0 && `, ${stats.pending} laukia`}
          </p>
        </div>
        <span aria-hidden className="hidden pb-8 font-display text-4xl text-haze-dim sm:block">
          =
        </span>
        <div>
          <p className="text-[0.9rem] text-haze">Vertė</p>
          <p className={`mt-1 font-display text-[2.2rem] leading-none font-bold ${tone(stats.value)}`}>
            <NumberFlow value={stats.value} locales="lt-LT" format={EURO_FLOW} suffix=" €" />
          </p>
          <p className="mt-2 text-[0.85rem] text-haze">kiek buvo vertos tavo kainos</p>
        </div>
        <span aria-hidden className="hidden pb-8 font-display text-4xl text-haze-dim sm:block">
          +
        </span>
        <div>
          <p className="text-[0.9rem] text-haze">Sėkmė</p>
          <p className={`mt-1 font-display text-[2.2rem] leading-none font-bold ${tone(stats.luck)}`}>
            <NumberFlow value={stats.luck} locales="lt-LT" format={EURO_FLOW} suffix=" €" />
          </p>
          <p className="mt-2 text-[0.85rem] text-haze">likusi, atsitiktinė dalis</p>
        </div>
      </div>
    </section>
  )
}

function StatGrid({ stats, bets }: { stats: BetStats; bets: ActiveBet[] }) {
  const execution = executionStats(bets)
  return (
    <>
    <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-rail sm:grid-cols-4">
      <Stat label="Laimėta, pralaimėta, grąžinta">
        {stats.won}–{stats.lost}–{stats.pushed}
      </Stat>
      <Stat label="Grąža">{stats.roi === null ? '–' : formatEdge(stats.roi)}</Stat>
      <Stat label="Vidutinis CLV" note={stats.clvMedian === null ? 'dar nėra uždarymo kainų' : `mediana ${formatEdge(stats.clvMedian)}`}>
        {stats.clvAverage === null ? '–' : formatEdge(stats.clvAverage)}
      </Stat>
      <Stat label="Įveikė uždarymo kainą" note={stats.withClose ? formatPercent(stats.beatClose / stats.withClose, 0) : undefined}>
        {stats.beatClose} <span className="font-sans text-base font-normal text-haze">iš {stats.withClose}</span>
      </Stat>
    </dl>

    {/* What the bookmaker actually gave, against what we showed. Only bets
        recorded since the site began storing the displayed price are counted. */}
    {execution.recorded > 0 && (
      <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-rail sm:grid-cols-4">
        <Stat label="Gavai kitą kainą" note={`iš ${execution.recorded} įrašytų`}>
          {execution.differed}
        </Stat>
        <Stat
          label="Vidutinis skirtumas"
          note={execution.averageSlippage !== null && execution.averageSlippage < 0 ? 'blogiau nei rodėm' : 'geriau nei rodėm'}
        >
          {execution.averageSlippage === null ? '–' : formatEdge(execution.averageSlippage)}
        </Stat>
        <Stat label="Apribota arba atmesta" note={execution.rejected ? `${execution.rejected} atmesta` : undefined}>
          {execution.limited + execution.rejected}
        </Stat>
        <Stat label="Nuo kainos iki statymo" note="mediana">
          {execution.medianDelayMinutes === null ? '–' : `${execution.medianDelayMinutes} min`}
        </Stat>
      </dl>
    )}
    </>
  )
}

function Stat({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="bg-stand p-4 sm:p-5">
      <dt className="text-[0.85rem] text-haze">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-bold tnum">{children}</dd>
      {note && <dd className="mt-0.5 text-[0.85rem] text-haze-dim">{note}</dd>}
    </div>
  )
}

const VERDICT = {
  normal: {
    label: 'Normaliose ribose',
    icon: Check,
    tone: 'bg-pitch-soft text-pitch',
    text: 'Rezultatas nuo vertės skiriasi tiek, kiek įprastai lemia atsitiktinumas.',
  },
  above: {
    label: 'Virš įprastų ribų',
    icon: TrendingUp,
    tone: 'bg-pitch-soft text-pitch',
    text: 'Sekėsi labiau nei įprasta. Neverta tikėtis, kad taip bus visada.',
  },
  below: {
    label: 'Žemiau įprastų ribų',
    icon: TrendingDown,
    tone: 'bg-[rgb(245_165_36/0.14)] text-warning',
    text: 'Nesisekė labiau nei įprasta. Taip nutinka ir su gerais statymais; svarbiausia, ar kainos toliau lenkia uždarymo kainą.',
  },
} as const

function ValueCard({ series, stats }: { series: ValuePoint[]; stats: BetStats }) {
  const end = series[series.length - 1]
  const state = VERDICT[verdict(end)]
  const Icon = state.icon
  const hasData = series.length > 1

  return (
    <section aria-labelledby="value-title" className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="value-title" className="text-[1.6rem]">
          Vertė ir rezultatas
        </h2>
        {hasData && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.85rem] font-semibold ${state.tone}`}>
            <Icon className="size-4" aria-hidden />
            {state.label}
          </span>
        )}
      </div>

      {hasData ? (
        <>
          <p className="mt-1 text-[0.95rem] text-haze">{state.text}</p>
          <div className="mt-5">
            <ValueChart points={series} />
          </div>
          {(stats.valuedAtEntry > 0 || stats.unvalued > 0) && (
            <ul className="mt-4 space-y-1.5 text-[0.9rem] text-haze">
              {stats.valuedAtEntry > 0 && (
                <li>
                  {stats.valuedAtEntry} {ltPlural(stats.valuedAtEntry, 'statymo', 'statymų', 'statymų')} vertė kol kas skaičiuojama pagal kainą
                  statymo metu, nes uždarymo kaina dar nesurinkta.
                </li>
              )}
              {stats.unvalued > 0 && (
                <li>
                  {stats.unvalued} {ltPlural(stats.unvalued, 'statymas', 'statymai', 'statymų')} be Pinnacle kainos ({signedEuro(stats.unvaluedProfit)}):
                  jie įskaičiuoti į rezultatą, bet vertės neturi, todėl visa jų suma patenka į sėkmę.
                </li>
              )}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-3 text-haze">Kai šio laikotarpio statymai užsibaigs, čia matysi, kaip rezultatas juda aplink vertę.</p>
      )}

      <details className="group mt-5 border-t border-rail pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium [&::-webkit-details-marker]:hidden">
          Kaip skaičiuojama vertė
          <ChevronDown className="size-4 text-haze transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="mt-3 max-w-[44rem] space-y-2.5 text-[0.95rem] text-haze">
          <p>
            Statymo vertė = suma × (koeficientas × tikroji tikimybė − 1). Tikrąją tikimybę imam iš Pinnacle kainos be maržos: rungtynių
            pradžioje, kai ją turim, kitaip tą akimirką, kai pažymėjai statymą.
          </p>
          <p>
            Sėkmė yra visa kita: rezultatas minus vertė. Po kelių statymų ji svarbesnė už vertę, po kelių šimtų vertė ima nulemti
            daugiau.
          </p>
          <p>
            Pilka juosta rodo, kur rezultatas atsiduria maždaug 95 % atvejų, kai statymų vertė tokia pati. Ji skaičiuojama iš tavo
            statymų sumų ir koeficientų.
          </p>
          <p>CLV rodo, kiek tavo koeficientas buvo geresnis už tikrąją kainą rungtynių pradžioje. Nuolat teigiamas CLV yra geriausias ženklas, kad statai teisingai.</p>
        </div>
      </details>
    </section>
  )
}

function History({
  pending,
  settled,
  tab,
  onTab,
}: {
  pending: ActiveBet[]
  settled: ActiveBet[]
  tab: StatusTab
  onTab: (tab: StatusTab) => void
}) {
  const list = tab === 'pending' ? pending : tab === 'settled' ? settled : [...pending, ...settled]
  const [shown, setShown] = useState(PAGE)
  const visible = list.slice(0, shown)
  return (
    <section aria-labelledby="history-title" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="history-title" className="text-[1.6rem]">
          Istorija
        </h2>
        <Segmented
          label="Būsena"
          options={[
            { value: 'all', label: `Visi ${pending.length + settled.length}` },
            { value: 'pending', label: `Laukia ${pending.length}` },
            { value: 'settled', label: `Užbaigti ${settled.length}` },
          ]}
          value={tab}
          onChange={onTab}
        />
      </div>
      {list.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-stand p-6 text-center text-haze hairline">Pagal pasirinktus filtrus statymų nėra.</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-rail overflow-hidden rounded-2xl bg-stand hairline">
            {visible.map((bet) => (
              <BetRow key={bet.id} bet={bet} />
            ))}
          </ul>
          {list.length > shown && (
            <button
              type="button"
              onClick={() => setShown((count) => count + PAGE)}
              className="mt-3 w-full rounded-xl bg-stand py-3 font-medium text-chalk hairline transition-colors hover:bg-stand-hover"
            >
              Rodyti daugiau ({list.length - shown})
            </button>
          )}
        </>
      )}
    </section>
  )
}

function BetRow({ bet }: { bet: ActiveBet }) {
  const status = STATUS[bet.status] ?? STATUS.laukia
  const book = BOOKS.includes(bet.bookmaker as BookName) ? (bet.bookmaker as BookName) : null
  const clv = closingValue(bet)
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 px-4 py-4 sm:px-5">
      <span className="pt-0.5">{book ? <BookMark book={book} /> : <span className="block size-8" />}</span>
      <div className="min-w-0">
        <p className="truncate font-medium">{bet.match.replace(' vs ', ' – ')}</p>
        <p className="truncate text-[0.9rem] text-haze">
          {ltSelection(bet.betDescription)}
          {bet.startsAt ? `, ${kickoffLabel(bet.startsAt)}` : ''}
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.85rem]">
          <span className="text-haze-dim">
            {formatEuro(bet.stake)} už {formatOdds(bet.odds)}, {bet.bookmaker}
          </span>
          {clv !== null ? (
            <span className={`rounded-full px-2 py-0.5 font-semibold ${clv > 0 ? 'bg-pitch-soft text-pitch' : 'bg-brick-soft text-brick'}`}>
              CLV {formatEdge(clv)}
            </span>
          ) : (
            <span className="text-haze-dim">{bet.status === 'laukia' ? 'uždarymo kaina dar nežinoma' : 'be uždarymo kainos'}</span>
          )}
        </p>
      </div>
      <div className="text-right">
        <span className={`inline-block rounded-full px-2.5 py-1 text-[0.8rem] font-medium ${status.tone}`}>
          {bet.canonicalOutcome ? OUTCOME_LABEL[bet.canonicalOutcome] : status.label}
        </span>
        {bet.profit !== null && (
          <p className={`mt-1 font-semibold ${tone(bet.profit)}`}>{signedEuro(bet.profit)}</p>
        )}
        {bet.homeScore != null && bet.awayScore != null && (
          <p className="mt-0.5 text-[0.8rem] text-haze-dim">
            <span className="sr-only">Rezultatas </span>
            {bet.homeScore}:{bet.awayScore}
          </p>
        )}
      </div>
    </li>
  )
}
