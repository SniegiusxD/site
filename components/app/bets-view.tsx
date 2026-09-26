'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, ChevronDown, Download, ReceiptText, RefreshCw, SlidersHorizontal, TrendingDown, TrendingUp } from 'lucide-react'
import { EmptyState } from './empty-state'
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
  fixtureCount,
  closingValue,
  inPeriod,
  matchesClv,
  valueSeries,
  verdict,
} from '@/lib/bet-value'
import { betsToCsv, csvFileName } from '@/lib/bets-csv'
import { breakdown, type BreakdownKind } from '@/lib/breakdowns'
import { workQueues } from '@/lib/work-queues'
import { EquityChart } from './equity-chart'
import { Glossary } from './glossary'
import { executionStats } from '@/lib/execution'
import { formatEdge, formatEuro, formatOdds, formatPercent, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { kickoffLabel, ltSelection } from '@/lib/live-view'
import { OUTCOME_LABEL } from '@/lib/member-outcomes'
import { ClvTrust } from '@/components/landing/clv-trust'
import type { TrustLabel } from '@/lib/close-evidence'
import { type SettledSummary, latestSettlement, settledSince } from '@/lib/since-last-visit'
import { useApi } from '@/lib/use-api'
import { useStoredOnce, writeStored } from '@/lib/use-stored-state'
import { sportName } from '@/lib/sports-lt'
import type { ActiveBet, BetStatus } from '@/lib/types'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { useAccount } from './account-provider'
import { LoadError } from './load-error'
import { ChipGroup } from './chip-group'
import { ProfitCalendar } from './profit-calendar'
import { Segmented } from './segmented'
import { ValueChart, signedEuro } from './value-chart'
import { EASE, SPRING } from '@/lib/motion'
import { centerOf, MoneyFlight, type MoneyFlightPath, onScreen } from './money-flight'
import { PullToRefresh } from './pull-to-refresh'

const STATUS: Record<BetStatus, { label: string; tone: string }> = {
  laukia: { label: 'Laukia', tone: 'bg-rail text-haze' },
  laimeta: { label: 'Laimėta', tone: 'bg-pitch-soft text-pitch' },
  pralaimeta: { label: 'Pralaimėta', tone: 'bg-brick-soft text-brick' },
  grazinta: { label: 'Grąžinta', tone: 'bg-rail text-chalk' },
  neisspresta: { label: 'Neišspręsta', tone: 'bg-rail text-haze-dim' },
}

/** What a member may set a result to by hand, in the order they think of it. */
const CORRECTIONS: Array<{ value: BetStatus; label: string }> = [
  { value: 'laimeta', label: 'Laimėta' },
  { value: 'pralaimeta', label: 'Pralaimėta' },
  { value: 'grazinta', label: 'Grąžinta' },
  { value: 'laukia', label: 'Grąžinti į laukiančius' },
]

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

const EDIT_LABEL: Record<string, string> = {
  odds: 'koeficientas',
  stake: 'suma',
  note: 'užrašas',
  tags: 'žymos',
  status: 'rezultatas',
  deleted: 'ištrinta',
}

/** Statuses read as their Lithuanian labels in the history, not as keys. */
const editValue = (field: string, value: string | null) =>
  field === 'status' && value ? (STATUS[value as BetStatus]?.label ?? value) : (value ?? '–')

/** "live, bandymas" becomes ["live", "bandymas"]; the server bounds them again. */
const splitTags = (text: string) =>
  text
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)

const tone = (value: number) => (value > 0.004 ? 'text-pitch' : value < -0.004 ? 'text-brick' : 'text-chalk')
/** One correction the member made to a bet, from its history. */
type Edit = { field: string; from: string | null; to: string | null; at: string }

const timeOf = (bet: ActiveBet) => new Date(betTime(bet) ?? 0).getTime()

/** closeTrust: the scanner's verdict on closing prices, read by the server page. */
export function BetsView({ closeTrust }: { closeTrust?: TrustLabel }) {
  const { data, error: loadError, loading, reload: load, settledAt } = useApi<{ bets: ActiveBet[] }>('/api/bets')
  const bets = data?.bets ?? null
  const [period, setPeriod] = useState<Period>('month')
  const [book, setBook] = useState('')
  const [sport, setSport] = useState('')
  const [clv, setClv] = useState<ClvFilter>('all')
  const [tag, setTag] = useState('')
  const [tab, setTab] = useState<StatusTab>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  // "Now" for the period filters is when the list arrived, as before.
  const [openedAt] = useState(() => Date.now())
  const now = useMemo(() => new Date(settledAt ?? openedAt), [settledAt, openedAt])
  const { email } = useAccount()

  // What settled since the last visit: the marker is read once for this view,
  // and the newest result is remembered as seen once the list is here.
  const seenKey = `${SEEN_KEY}${email}`
  const marker = useStoredOnce(seenKey)
  const [sinceClosed, setSinceClosed] = useState(false)
  const since = useMemo(() => (bets && !sinceClosed ? settledSince(bets, marker) : null), [bets, marker, sinceClosed])
  useEffect(() => {
    if (!bets) return
    const latest = latestSettlement(bets)
    writeStored(seenKey, marker && marker > latest ? marker : latest)
  }, [bets, marker, seenKey])

  // Results are graded after the list is sent. If a bet's match should be over
  // but it still waits, look once more half a minute later.
  const rechecked = useRef(false)
  useEffect(() => {
    if (!bets || rechecked.current) return
    const due = bets.some((bet) => bet.status === 'laukia' && timeOf(bet) < Date.now() - 2 * 3_600_000)
    if (!due) return
    rechecked.current = true
    const id = window.setTimeout(load, 30_000)
    return () => window.clearTimeout(id)
  }, [bets, load])

  // Filters scope everything below them; the calendar keeps its own month.
  const scoped = useMemo(
    () =>
      (bets ?? []).filter(
        (bet) =>
          (!book || bet.bookmaker === book) &&
          (!sport || bet.sport === sport) &&
          (!tag || (bet.tags ?? []).includes(tag)) &&
          matchesClv(bet, clv),
      ),
    [bets, book, sport, clv, tag],
  )
  const inRange = useMemo(() => scoped.filter((bet) => inPeriod(bet, period, now)), [scoped, period, now])
  const stats = useMemo(() => betStats(inRange), [inRange])
  const series = useMemo(() => valueSeries(inRange), [inRange])
  const books = useMemo(() => BOOKS.filter((name) => (bets ?? []).some((bet) => bet.bookmaker === name)), [bets])
  const sports = useMemo(() => [...new Set((bets ?? []).map((bet) => bet.sport))].sort(), [bets])
  const tags = useMemo(() => [...new Set((bets ?? []).flatMap((bet) => bet.tags ?? []))].sort(), [bets])
  const pending = useMemo(() => inRange.filter((bet) => bet.status === 'laukia').sort((a, b) => timeOf(a) - timeOf(b)), [inRange])
  const settled = useMemo(() => inRange.filter((bet) => bet.status !== 'laukia').sort((a, b) => timeOf(b) - timeOf(a)), [inRange])
  const activeFilters = (book ? 1 : 0) + (sport ? 1 : 0) + (tag ? 1 : 0) + (clv !== 'all' ? 1 : 0)

  // The moment results land: a win flies from the card into the result, which
  // rolls up from what it was before; a loss just rolls down. Once per view,
  // only on the unfiltered view (a filter may leave the new results out), and
  // never in calm mode, where the result simply shows its current value.
  const reduced = useReducedMotion()
  const sinceProfitRef = useRef<HTMLParagraphElement>(null)
  const resultRef = useRef<HTMLParagraphElement>(null)
  const [played, setPlayed] = useState(false)
  const [flight, setFlight] = useState<MoneyFlightPath | null>(null)
  const [landed, setLanded] = useState(0)
  const staging = Boolean(since && since.profit !== 0 && !reduced && !played && activeFilters === 0)
  useEffect(() => {
    if (!staging || !since) return
    const id = window.setTimeout(() => {
      const from = sinceProfitRef.current?.getBoundingClientRect()
      const to = resultRef.current?.getBoundingClientRect()
      if (since.profit > 0 && onScreen(from) && onScreen(to)) {
        setFlight({ label: signedEuro(since.profit), from: centerOf(from), to: centerOf(to) })
      } else {
        setPlayed(true)
      }
    }, 600)
    return () => window.clearTimeout(id)
  }, [staging, since])
  const land = useCallback(() => {
    setFlight(null)
    setPlayed(true)
    setLanded((value) => value + 1)
  }, [])
  const shownProfit = staging && since ? stats.profit - since.profit : stats.profit

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
      <PullToRefresh onRefresh={load} />

      {loadError && <LoadError error={loadError} what="statymų" onRetry={load} retrying={loading} className="mt-6" />}

      {bets === null ? (
        // Until the first list arrives; after a failure the message above replaces it.
        !loadError || loading ? (
          <div role="status" className="mt-6 space-y-3">
            <span className="sr-only">Įkeliam statymus…</span>
            <div aria-hidden className="kr-skeleton h-11 w-72 max-w-full rounded-xl" />
            {[0, 1, 2, 3].map((row) => (
              <div key={row} aria-hidden className="kr-skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : null
      ) : bets.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Dar nepažymėjai nė vieno statymo"
          text="Kai pastatysi pagal signalą, paspausk „Pastačiau“, ir statymas atsiras čia su rezultatu, verte ir uždarymo kaina."
          action={
            <Link href="/signalai" className="kr-press inline-block rounded-xl bg-floodlight px-5 py-3 font-semibold text-night transition-transform hover:-translate-y-0.5">
              Į signalus
            </Link>
          }
          className="mt-10 rounded-2xl bg-stand p-8 hairline"
        />
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
                  setTag('')
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
              {tags.length > 0 && (
                <ChipGroup
                  label="Žymos"
                  options={[{ value: '', label: 'Visos' }, ...tags.map((name) => ({ value: name, label: name }))]}
                  value={tag}
                  onChange={setTag}
                />
              )}
              <ChipGroup label="Uždarymo kaina" options={CLV_CHOICES} value={clv} onChange={setClv} />
            </div>
          )}

          <AnimatePresence>
            {since && <SinceLastVisit summary={since} profitRef={sinceProfitRef} onClose={() => setSinceClosed(true)} />}
          </AnimatePresence>
          <ThreeNumbers stats={stats} bets={scoped} profit={shownProfit} resultRef={resultRef} landed={landed} />
          <MoneyFlight path={flight} onLanded={land} />
          <Glossary />
          <StatGrid stats={stats} bets={scoped} closeTrust={closeTrust} />
          <ValueCard series={series} stats={stats} />
          <ProfitCalendar bets={scoped} />
          <WorkQueueNotice bets={scoped} />
          <EquityChart bets={scoped} />
          <Breakdowns bets={scoped} />
          <History pending={pending} settled={settled} tab={tab} onTab={setTab} onChanged={load} />
        </div>
      )}
    </main>
  )
}

const CLV_EXPLAINED_KEY = 'clv-badge-explained'

function SinceLastVisit({
  summary,
  profitRef,
  onClose,
}: {
  summary: SettledSummary
  profitRef: React.Ref<HTMLParagraphElement>
  onClose: () => void
}) {
  const reduced = useReducedMotion()
  // The first time a member sees the badge, one line says why it matters.
  const explained = useStoredOnce(CLV_EXPLAINED_KEY)
  useEffect(() => {
    if (summary.withClose > 0) writeStored(CLV_EXPLAINED_KEY, '1')
  }, [summary.withClose])
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
      transition={{ duration: 0.3, ease: EASE }}
      className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stand p-4 hairline sm:px-6"
    >
      <div className="min-w-0">
        <p className="font-medium">
          Nuo paskutinio apsilankymo užsibaigė {summary.count} {ltPlural(summary.count, 'statymas', 'statymai', 'statymų')}
        </p>
        <p className="mt-0.5 text-[0.9rem] text-haze">{parts}</p>
        {summary.withClose > 0 && (
          <>
            {/* Quality, not luck: the one result worth celebrating. */}
            <motion.p
              initial={reduced ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={reduced ? undefined : { ...SPRING.snappy, delay: 0.35 }}
              className={`mt-2 inline-flex origin-left items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.85rem] font-semibold ${
                summary.beatClose > 0 ? 'bg-pitch-soft text-pitch' : 'bg-night/60 text-haze'
              }`}
            >
              {summary.beatClose > 0 && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
              {summary.beatClose} iš {summary.withClose} aplenkė uždarymą
            </motion.p>
            {explained === null && summary.beatClose > 0 && (
              <p className="mt-1.5 text-[0.85rem] text-haze">Tai svarbiausias rodiklis: ilgainiui jis lemia rezultatą.</p>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <p ref={profitRef} className={`font-display text-[1.8rem] leading-none font-bold tnum ${tone(summary.profit)}`}>
          {signedEuro(summary.profit)}
        </p>
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

function ThreeNumbers({
  stats,
  bets,
  profit,
  resultRef,
  landed,
}: {
  stats: BetStats
  bets: ActiveBet[]
  /** The result to show: before a win lands, what it was; then the current value. */
  profit: number
  resultRef: React.Ref<HTMLParagraphElement>
  /** Counts landings, so the number bumps once as each win arrives. */
  landed: number
}) {
  // Lines of the same match are one opinion; saying so keeps the sample honest.
  const fixtures = fixtureCount(bets)
  return (
    <section aria-label="Rezultatas, vertė ir sėkmė" className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-7">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-[minmax(0,1.5fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-end">
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[0.9rem] text-haze">Rezultatas</p>
          <p ref={resultRef} className={`mt-1 font-display text-[3.4rem] leading-none font-bold ${tone(profit)}`}>
            <motion.span
              key={landed}
              className="inline-block origin-left"
              initial={landed ? { scale: 1.08 } : false}
              animate={{ scale: 1 }}
              transition={SPRING.snappy}
            >
              <NumberFlow value={profit} locales="lt-LT" format={EURO_FLOW} suffix=" €" />
            </motion.span>
          </p>
          <p className="mt-2 text-[0.85rem] text-haze">
            {stats.settled} {ltPlural(stats.settled, 'užbaigtas statymas', 'užbaigti statymai', 'užbaigtų statymų')}
            {fixtures > 0 && fixtures < stats.settled && ` iš ${fixtures} ${ltPlural(fixtures, 'rungtynių', 'rungtynių', 'rungtynių')}`}
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

function StatGrid({ stats, bets, closeTrust }: { stats: BetStats; bets: ActiveBet[]; closeTrust?: TrustLabel }) {
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
    {closeTrust && <ClvTrust label={closeTrust} className="mt-2.5" />}
    {/* Your own CLV next to everyone's: the same measure over every signal. */}
    <p className="mt-1.5 text-[0.85rem]">
      <Link href="/rezultatai" className="text-haze underline decoration-rail-strong underline-offset-4 hover:text-chalk">
        Visų signalų CLV ir rezultatai
      </Link>
    </p>

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

/**
 * Bets that need attention: no closing price, or still waiting long after the
 * match. Silence here would let both quietly distort the averages.
 */
function WorkQueueNotice({ bets }: { bets: ActiveBet[] }) {
  const queues = workQueues(bets)
  const missing = queues.missingClose.length
  const stale = queues.staleUnsettled.length
  if (missing === 0 && stale === 0) return null

  return (
    <section aria-label="Reikia dėmesio" className="mt-6 rounded-2xl bg-[rgb(245_165_36/0.08)] p-5 shadow-[inset_0_0_0_1px_rgb(245_165_36/0.3)]">
      <p className="flex items-start gap-2.5 font-medium text-warning">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        Reikia dėmesio
      </p>
      <ul className="mt-2.5 grid gap-1.5 text-[0.9rem] text-haze">
        {missing > 0 && (
          <li>
            <span className="font-semibold text-chalk tnum">{missing}</span>{' '}
            {ltPlural(missing, 'užbaigtas statymas', 'užbaigti statymai', 'užbaigtų statymų')} be uždarymo kainos — jie neįskaičiuoti į CLV.
          </li>
        )}
        {stale > 0 && (
          <li>
            <span className="font-semibold text-chalk tnum">{stale}</span>{' '}
            {ltPlural(stale, 'statymas laukia', 'statymai laukia', 'statymų laukia')} nors rungtynės jau turėjo baigtis. Jei rezultatas
            žinomas, o mes jo nepagavom, pažymėk ranka arba ištrink.
          </li>
        )}
      </ul>
    </section>
  )
}

/** Where the results came from: by bookmaker, sport or market family. */
function Breakdowns({ bets }: { bets: ActiveBet[] }) {
  const [kind, setKind] = useState<BreakdownKind>('book')
  const rows = breakdown(bets, kind)
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="breakdown-title" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="breakdown-title" className="text-[1.6rem]">
          Iš kur rezultatas
        </h2>
        <Segmented
          label="Grupuoti"
          options={[
            { value: 'book', label: 'Kontoros' },
            { value: 'sport', label: 'Sportas' },
            { value: 'market', label: 'Rinkos' },
            { value: 'edge', label: 'Vertė' },
            { value: 'pricing', label: 'Linija' },
          ]}
          value={kind}
          onChange={setKind}
        />
      </div>
      <ul className="mt-4 divide-y divide-rail overflow-hidden rounded-2xl bg-stand hairline">
        {rows.map((row) => (
          <li key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3.5 sm:px-5">
            <span className="font-medium">{row.label}</span>
            <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.9rem] text-haze tnum">
              <span>
                {row.settled} {ltPlural(row.settled, 'statymas', 'statymai', 'statymų')}
              </span>
              <span>{formatEuro(row.staked)} pastatyta</span>
              <span>grąža {row.roi === null ? '–' : formatEdge(row.roi)}</span>
              <span>CLV {row.clv === null ? '–' : formatEdge(row.clv)}</span>
              <span className={`font-semibold ${tone(row.profit)}`}>{signedEuro(row.profit)}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function History({
  pending,
  settled,
  tab,
  onTab,
  onChanged,
}: {
  pending: ActiveBet[]
  settled: ActiveBet[]
  tab: StatusTab
  onTab: (tab: StatusTab) => void
  /** Reload after an edit or a delete. */
  onChanged: () => void
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
        <div className="flex flex-wrap items-center gap-2">
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
        <button
          type="button"
          onClick={() => {
            // Built in the browser: the history is already here, and a round trip
            // would only be a second copy of the same rows.
            const blob = new Blob([betsToCsv([...pending, ...settled])], { type: 'text/csv;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = csvFileName()
            link.click()
            URL.revokeObjectURL(url)
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-stand px-3.5 text-[0.9rem] font-medium hairline transition-colors hover:bg-stand-hover"
        >
          <Download className="size-4" aria-hidden />
          CSV
        </button>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-stand p-6 text-center text-haze hairline">Pagal pasirinktus filtrus statymų nėra.</p>
      ) : (
        <>
          <ul className="mt-4 divide-y divide-rail overflow-hidden rounded-2xl bg-stand hairline">
            {visible.map((bet) => (
              <BetRow key={bet.id} bet={bet} onChanged={onChanged} />
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

function BetRow({ bet, onChanged }: { bet: ActiveBet; onChanged: () => void }) {
  const status = STATUS[bet.status] ?? STATUS.laukia
  const book = BOOKS.includes(bet.bookmaker as BookName) ? (bet.bookmaker as BookName) : null
  const clv = closingValue(bet)
  const [editing, setEditing] = useState(false)
  const [odds, setOdds] = useState(() => formatOdds(bet.odds))
  const [stake, setStake] = useState(() => String(bet.stake))
  const [note, setNote] = useState(() => bet.note ?? '')
  const [tagText, setTagText] = useState(() => (bet.tags ?? []).join(', '))
  // Only a bet whose match has begun can have a result worth correcting.
  const started = bet.status !== 'laukia' || (bet.startsAt ? new Date(bet.startsAt) < new Date() : false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The corrections, loaded only when the editor is opened. The editor still
  // works without the history, so a failure shows none.
  const corrections = useApi<{ edits?: Edit[] }>(editing ? `/api/bets/${bet.id}` : null)
  const edits = corrections.data?.edits ?? []

  async function send(method: 'PATCH' | 'DELETE', status?: BetStatus) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/bets/${bet.id}`, {
        method,
        headers: method === 'PATCH' ? { 'Content-Type': 'application/json' } : undefined,
        body:
          method === 'PATCH'
            ? JSON.stringify(
                status
                  ? { status }
                  : bet.status === 'laukia'
                    ? { odds: Number(odds.replace(',', '.')), stake: Number(stake.replace(',', '.')), note, tags: splitTags(tagText) }
                    : { note, tags: splitTags(tagText) },
              )
            : undefined,
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? 'Nepavyko.')
        return
      }
      setEditing(false)
      onChanged()
    } catch {
      setError('Nepavyko pasiekti serverio.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 px-4 py-4 sm:px-5">
      <span className="pt-0.5">{book ? <BookMark book={book} /> : <span className="block size-8" />}</span>
      <div className="min-w-0">
        <p className="truncate font-medium">{bet.match.replace(' vs ', ' – ')}</p>
        <p className="truncate text-[0.9rem] text-haze">
          {ltSelection(bet.betDescription)}
          {bet.startsAt ? `, ${kickoffLabel(bet.startsAt)}` : ''}
        </p>
        {bet.note && <p className="mt-1 truncate text-[0.85rem] text-haze-dim italic">„{bet.note}&ldquo;</p>}
        {bet.resultSource === 'member' && bet.status !== 'laukia' && (
          <p className="mt-1 text-[0.8rem] text-haze-dim">rezultatą pataisei pats</p>
        )}
        {(bet.tags ?? []).length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1.5">
            {(bet.tags ?? []).map((tag) => (
              <span key={tag} className="rounded-full bg-rail px-2 py-0.5 text-[0.75rem] text-haze">
                {tag}
              </span>
            ))}
          </p>
        )}
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
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-1 block w-full text-right text-[0.8rem] text-haze underline decoration-rail-strong underline-offset-4 hover:text-chalk"
          >
            {bet.status === 'laukia' ? 'Taisyti' : 'Užrašas'}
          </button>
        )}
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

      {editing && (
        <div className="col-span-3 mt-3 rounded-xl bg-night/60 p-3">
          <div className="flex flex-wrap items-end gap-3">
            {bet.status === 'laukia' && (
            <label className="text-[0.8rem] text-haze">
              Koeficientas
              <input
                type="text"
                inputMode="decimal"
                value={odds}
                onChange={(event) => setOdds(event.target.value)}
                className="mt-1 block h-10 w-24 rounded-lg bg-stand px-2.5 text-[0.95rem] text-chalk tnum hairline"
              />
            </label>
            )}
            {bet.status === 'laukia' && (
            <label className="text-[0.8rem] text-haze">
              Suma, €
              <input
                type="text"
                inputMode="decimal"
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                className="mt-1 block h-10 w-24 rounded-lg bg-stand px-2.5 text-[0.95rem] text-chalk tnum hairline"
              />
            </label>
            )}
            <label className="min-w-[12rem] flex-1 text-[0.8rem] text-haze">
              Užrašas
              <input
                type="text"
                value={note}
                maxLength={500}
                placeholder="Kodėl paėmei, ką kontora padarė…"
                onChange={(event) => setNote(event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg bg-stand px-2.5 text-[0.95rem] text-chalk hairline placeholder:text-haze-dim"
              />
            </label>
            <label className="min-w-[10rem] flex-1 text-[0.8rem] text-haze">
              Žymos
              <input
                type="text"
                value={tagText}
                maxLength={160}
                placeholder="live, bandymas…"
                onChange={(event) => setTagText(event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg bg-stand px-2.5 text-[0.95rem] text-chalk hairline placeholder:text-haze-dim"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => send('PATCH')}
              className="kr-press h-10 rounded-lg bg-chalk px-3.5 font-semibold text-night disabled:opacity-60"
            >
              Išsaugoti
            </button>
            {/* Automatic settlement is right about nine times in ten. The tenth
                is the member's to correct, and the correction is recorded. */}
            {started && (
              <div className="basis-full text-[0.8rem] text-haze">
                Rezultatas neteisingas?
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {CORRECTIONS.filter((choice) => choice.value !== bet.status).map((choice) => (
                    <button
                      key={choice.value}
                      type="button"
                      disabled={busy}
                      onClick={() => send('PATCH', choice.value)}
                      className="h-9 rounded-lg bg-stand px-3 text-[0.9rem] text-chalk hairline transition-colors hover:bg-stand-hover disabled:opacity-60"
                    >
                      {choice.label}
                    </button>
                  ))}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setError(null)
              }}
              className="h-10 rounded-lg px-3 text-haze hover:text-chalk"
            >
              Atšaukti
            </button>
            {bet.status === 'laukia' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  // A mistaken record should be removable, but not by accident.
                  if (window.confirm('Ištrinti šį statymą? Grąža ir CLV perskaičiuojami be jo.')) send('DELETE')
                }}
                className="ml-auto h-10 rounded-lg px-3 font-medium text-brick hover:bg-brick-soft disabled:opacity-60"
              >
                Ištrinti
              </button>
            )}
          </div>
          {error && <p className="mt-2 text-[0.85rem] text-brick">{error}</p>}
          {edits.length > 0 && (
            <ul className="mt-3 grid gap-1 border-t border-rail pt-2.5 text-[0.8rem] text-haze-dim">
              {edits.slice(0, 4).map((edit) => (
                <li key={`${edit.field}-${edit.at}`}>
                  {EDIT_LABEL[edit.field] ?? edit.field}: {editValue(edit.field, edit.from)} → {editValue(edit.field, edit.to)} (
                  {kickoffLabel(edit.at)})
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
