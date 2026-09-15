'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Bell, Check, ChevronDown, Eye, RefreshCw, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BookMark } from '@/components/landing/book-mark'
import { type BoardBet, boardStake, dailyProgress, exposureFor } from '@/lib/exposure'
import { formatEdge, formatEuro, formatOdds, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import type { LiveBoard, LiveSignal } from '@/lib/live-signals'
import {
  agoLabel,
  type BoardFilters,
  type BoardRow,
  boardRows,
  clockLabel,
  isStale,
  ltSelection,
  sportsIn,
  timeUntilLabel,
} from '@/lib/live-view'
import { DAILY_BET_CHOICES } from '@/lib/preferences'
import { sportName } from '@/lib/sports-lt'
import { useAccount } from './account-provider'
import { ChipGroup } from './chip-group'
import { SignalDetail } from './signal-detail'

const POLL_MS = 60_000
const EASE = [0.22, 1, 0.36, 1] as const
const EDGE_CHOICES = [0.01, 0.02, 0.03, 0.05]
const HOUR_CHOICES = [
  { value: 6, label: '6 val.' },
  { value: 24, label: '24 val.' },
  { value: 48, label: '2 d.' },
  { value: 168, label: '7 d.' },
]
const HIDDEN_KEY = 'hidden-signals'

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 64rem)')
    const update = () => setDesktop(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return desktop
}

/** Signals the member hid on this device. A convenience only, so browser storage is fine. */
function useHiddenSignals(signals: LiveSignal[]) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(HIDDEN_KEY)
      if (raw) setHidden(new Set(JSON.parse(raw) as string[]))
    } catch {
      // Private windows can refuse storage; hiding then lasts for this visit.
    }
  }, [])

  const save = useCallback((next: Set<string>) => {
    setHidden(next)
    try {
      window.localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]))
    } catch {
      // See above.
    }
  }, [])

  // Forget signals that left the board so the list does not grow forever.
  useEffect(() => {
    if (hidden.size === 0 || signals.length === 0) return
    const present = new Set(signals.map((signal) => signal.id))
    const kept = [...hidden].filter((id) => present.has(id))
    if (kept.length !== hidden.size) save(new Set(kept))
  }, [signals, hidden, save])

  return [hidden, save] as const
}

export function SignalBoard({ initial, initialBets }: { initial: LiveBoard; initialBets: BoardBet[] }) {
  const router = useRouter()
  const reduced = useReducedMotion()
  const desktop = useIsDesktop()
  const { account, updateSettings, saveError } = useAccount()
  const prefs = account.preferences

  const [board, setBoard] = useState(initial)
  const [bets, setBets] = useState(initialBets)
  const [now, setNow] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sport, setSport] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  const [selected, setSelected] = useState<BoardRow | null>(null)
  const [hidden, setHidden] = useHiddenSignals(board.signals)

  const refreshBets = useCallback(async () => {
    try {
      const response = await fetch('/api/bets/recent', { cache: 'no-store' })
      if (response.ok) setBets((await response.json()).bets)
    } catch {
      // The board still works; the target and warnings catch up on the next poll.
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const [response] = await Promise.all([fetch('/api/live', { cache: 'no-store' }), refreshBets()])
      if (response.status === 402 || response.status === 401) {
        router.refresh()
        return
      }
      if (!response.ok) throw new Error()
      setBoard(await response.json())
      setLoadError(null)
    } catch {
      setLoadError('Nepavyko atnaujinti signalų. Bandysim dar kartą po minutės.')
    } finally {
      setRefreshing(false)
      setNow(new Date())
    }
  }, [router, refreshBets])

  useEffect(() => {
    const poll = window.setInterval(refresh, POLL_MS)
    const tick = window.setInterval(() => setNow(new Date()), 30_000)
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  const filters: BoardFilters = {
    books: prefs.books,
    minEdge: prefs.minEdge,
    minOdds: prefs.minOdds,
    maxOdds: prefs.maxOdds,
    maxHoursToStart: prefs.maxHoursToStart,
    sport,
  }
  const rows = useMemo(() => boardRows(board.signals, filters, now), [board.signals, JSON.stringify(filters), now]) // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(() => rows.open.filter((row) => !hidden.has(row.signal.id)), [rows.open, hidden])
  const hiddenRows = useMemo(() => rows.open.filter((row) => hidden.has(row.signal.id)), [rows.open, hidden])
  const looseCount = useMemo(
    () =>
      boardRows(
        board.signals,
        { books: [...BOOKS], minEdge: 0, minOdds: 1, maxOdds: 1000, maxHoursToStart: 24 * 14, sport: null },
        now,
      ).open.length,
    [board.signals, now],
  )
  const sports = useMemo(() => sportsIn(board.signals), [board.signals])
  const signalsById = useMemo(() => new Map(board.signals.map((signal) => [signal.id, signal])), [board.signals])

  // Keep the open detail in sync with fresh data; if the signal left the
  // board entirely, keep showing the last copy (it renders as closed).
  const selectedRow = useMemo(() => {
    if (!selected) return null
    const fresh = [...rows.open, ...rows.closed].find((row) => row.signal.id === selected.signal.id)
    if (fresh) return fresh
    return { signal: { ...selected.signal, status: 'closed' as const, closedAt: selected.signal.closedAt ?? now.toISOString() }, price: selected.price }
  }, [selected, rows, now])

  useEffect(() => {
    if (desktop && !selected && visible[0]) setSelected(visible[0])
  }, [desktop, selected, visible])

  function toggleBook(book: BookName) {
    const next = prefs.books.includes(book) ? prefs.books.filter((b) => b !== book) : BOOKS.filter((b) => b === book || prefs.books.includes(b))
    if (next.length === 0) return
    updateSettings({ books: next })
  }

  // The undo button in a toast runs later; it must see signals hidden since.
  const hiddenRef = useRef(hidden)
  hiddenRef.current = hidden

  function unhideId(id: string) {
    const next = new Set(hiddenRef.current)
    next.delete(id)
    setHidden(next)
  }

  function hide(row: BoardRow) {
    const next = new Set(hidden)
    next.add(row.signal.id)
    setHidden(next)
    if (selected?.signal.id === row.signal.id) setSelected(null)
    toast('Signalas paslėptas', {
      description: row.price.eventName,
      action: { label: 'Grąžinti', onClick: () => unhideId(row.signal.id) },
    })
  }

  function unhide(row: BoardRow) {
    unhideId(row.signal.id)
  }

  const onTracked = useCallback(
    (bet: BoardBet) => {
      setBets((current) => [bet, ...current.filter((item) => item.id !== bet.id)])
      refreshBets()
    },
    [refreshBets],
  )

  const status = board.status
  const stale = status ? isStale(status.publishedAt, now) : false
  const best = visible[0]?.price.edge

  function renderRow(row: BoardRow, options: { isHidden?: boolean } = {}) {
    const exposure = exposureFor(row.signal, bets, signalsById)
    const { suggested } = boardStake(prefs, row.signal, row.price, exposure)
    return (
      <SignalRow
        key={row.signal.id}
        row={row}
        now={now}
        active={selectedRow?.signal.id === row.signal.id}
        stake={suggested}
        limit={prefs.bookLimits[row.price.book]}
        tracked={exposure.selection.staked}
        sameMatch={exposure.match.count}
        isHidden={options.isHidden}
        onSelect={() => setSelected(row)}
        onToggleHidden={row.signal.status === 'open' ? () => (options.isHidden ? unhide(row) : hide(row)) : undefined}
      />
    )
  }

  return (
    <main className="lg:grid lg:h-dvh lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
      <section aria-label="Signalų sąrašas" className="flex min-h-0 flex-col lg:border-r lg:border-rail">
        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          <div className="border-b border-rail px-4 pt-5 pb-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <h1 className="text-[2.2rem]">Signalai</h1>
                <p className="flex items-center gap-1.5 text-[0.95rem] text-pitch">
                  <span className="relative flex size-2">
                    {status?.sharpAvailable && !stale && (
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-pitch opacity-60 motion-reduce:hidden" />
                    )}
                    <span className="relative inline-flex size-2 rounded-full bg-pitch" />
                  </span>
                  <span className="tnum">{visible.length}</span> gyvai
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href="/profilis#telegram"
                  aria-label="Telegram pranešimai"
                  className="grid size-10 place-items-center rounded-xl text-haze transition-colors hover:bg-stand hover:text-chalk"
                >
                  <Bell className="size-5" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={refresh}
                  aria-label="Atnaujinti"
                  className="grid size-10 place-items-center rounded-xl text-haze transition-colors hover:bg-stand hover:text-chalk"
                >
                  <RefreshCw className={`size-5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
                </button>
                <button
                  type="button"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((value) => !value)}
                  className={`ml-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl font-medium transition-colors max-sm:w-10 sm:px-3 ${filtersOpen ? 'bg-chalk text-night' : 'bg-stand text-chalk hairline hover:bg-stand-hover'}`}
                >
                  <SlidersHorizontal className="size-4" aria-hidden />
                  {/* Phones: the title row has no room for the word; it stays for screen readers. */}
                  <span className="max-sm:sr-only">Filtrai</span>
                </button>
              </div>
            </div>
            <p className="mt-1 text-[0.9rem] text-haze">
              {status ? `Atnaujinta ${agoLabel(status.publishedAt, now)} (${clockLabel(status.publishedAt)})` : 'Laukiam pirmo skenavimo'}
              {best !== undefined && (
                <>
                  , geriausia vertė <span className="font-semibold text-floodlight">{formatEdge(best)}</span>
                </>
              )}
            </p>

            <DailyTarget bets={bets} now={now} target={prefs.dailyBets} onChange={(dailyBets) => updateSettings({ dailyBets })} />

            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Kontoros">
              {BOOKS.map((book) => {
                const on = prefs.books.includes(book)
                return (
                  <button
                    key={book}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleBook(book)}
                    className={`inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[0.9rem] font-medium transition-[background-color,color,opacity] ${on ? 'bg-rail text-chalk' : 'text-haze hover:text-chalk'}`}
                  >
                    <BookMark book={book} size="sm" />
                    {book}
                  </button>
                )
              })}
            </div>

            <AnimatePresence initial={false}>
              {filtersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-5">
                    <ChipGroup
                      label="Mažiausia vertė"
                      options={EDGE_CHOICES.map((value) => ({ value, label: `nuo ${Math.round(value * 100)} %` }))}
                      value={prefs.minEdge}
                      onChange={(minEdge) => updateSettings({ minEdge })}
                    />
                    <ChipGroup
                      label="Iki rungtynių"
                      options={HOUR_CHOICES}
                      value={prefs.maxHoursToStart}
                      onChange={(maxHoursToStart) => updateSettings({ maxHoursToStart })}
                    />
                    <ChipGroup
                      label="Koeficientai"
                      options={[
                        { value: '1.3-6', label: 'Visi' },
                        { value: '1.3-3', label: 'Iki 3,00' },
                        { value: '1.5-2.5', label: '1,50–2,50' },
                      ]}
                      value={`${prefs.minOdds}-${prefs.maxOdds}`}
                      onChange={(range) => {
                        const [minOdds, maxOdds] = range.split('-').map(Number)
                        updateSettings({ minOdds, maxOdds })
                      }}
                    />
                    {sports.length > 1 && (
                      <ChipGroup
                        label="Sporto šaka"
                        options={[{ value: '', label: 'Visos' }, ...sports.map((value) => ({ value, label: sportName(value) }))]}
                        value={sport ?? ''}
                        onChange={(value) => setSport(value || null)}
                      />
                    )}
                    {saveError && <p className="text-[0.9rem] text-brick">{saveError}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {status && !status.sharpAvailable && (
            <Notice>
              Pinnacle šiuo metu nepasiekiamas, todėl kainos neatnaujinamos nuo {clockLabel(status.publishedAt)}. Prieš statydamas
              patikrink koeficientą kontoroje.
            </Notice>
          )}
          {status?.sharpAvailable && stale && (
            <Notice>
              Paskutinis skenavimas {clockLabel(status.publishedAt)}, {agoLabel(status.publishedAt, now)}. Kainos galėjo pasikeisti.
            </Notice>
          )}
          {loadError && <Notice>{loadError}</Notice>}

          {visible.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-display text-3xl font-bold">
                {status ? 'Šiuo metu signalų nėra' : 'Signalai dar neskelbiami'}
              </p>
              <p className="mx-auto mt-3 max-w-[22rem] text-haze">
                {!status
                  ? 'Kai tik ateis pirmas skenavimas, signalai atsiras čia patys.'
                  : hiddenRows.length > 0 && rows.open.length === hiddenRows.length
                    ? 'Visus atvirus signalus paslėpei. Juos grąžinsi apačioje.'
                    : looseCount > 0
                      ? `Pagal tavo filtrus nieko nėra, bet iš viso atviri ${looseCount} ${ltPlural(looseCount, 'signalas', 'signalai', 'signalų')}. Pakeisk filtrus arba kontoras.`
                      : 'Naujas skenavimas vyksta kas pusvalandį. Puslapis atsinaujins pats.'}
              </p>
            </div>
          ) : (
            <ul>{visible.map((row) => renderRow(row))}</ul>
          )}

          {hiddenRows.length > 0 && (
            <Collapsible label={`Paslėpti (${hiddenRows.length})`} open={showHidden} onToggle={() => setShowHidden((value) => !value)}>
              <ul>{hiddenRows.map((row) => renderRow(row, { isHidden: true }))}</ul>
            </Collapsible>
          )}

          {rows.closed.length > 0 && (
            <Collapsible label={`Užsidarę per 3 val. (${rows.closed.length})`} open={showClosed} onToggle={() => setShowClosed((value) => !value)}>
              <ul className="opacity-70">{rows.closed.map((row) => renderRow(row))}</ul>
            </Collapsible>
          )}
        </div>
      </section>

      {/* Desktop detail */}
      <section aria-label="Signalo informacija" className="hidden min-h-0 overflow-y-auto lg:block">
        {selectedRow ? (
          <SignalDetail
            key={`${selectedRow.signal.id}-${selectedRow.price.book}`}
            signal={selectedRow.signal}
            price={selectedRow.price}
            now={now}
            bets={bets}
            signalsById={signalsById}
            onTracked={onTracked}
          />
        ) : (
          <div className="grid h-full place-items-center px-10 text-center">
            <div className="max-w-[26rem]">
              <p className="font-display text-3xl font-bold">
                {visible.length ? 'Pasirink signalą sąraše' : 'Čia matysi signalo kainas'}
              </p>
              <p className="mt-3 text-haze">
                Visų kontorų koeficientus, tikrąją kainą, siūlomą sumą ir statymo pavadinimą, kurį nukopijuoji
                savo kontoros paieškai.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Phone detail sheet */}
      <AnimatePresence>
        {!desktop && selectedRow && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Signalo informacija"
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={{ duration: 0.4, ease: EASE }}
            className="fixed inset-0 z-50 overflow-y-auto bg-night"
          >
            <SignalDetail
              key={`${selectedRow.signal.id}-${selectedRow.price.book}`}
              signal={selectedRow.signal}
              price={selectedRow.price}
              now={now}
              bets={bets}
              signalsById={signalsById}
              onTracked={onTracked}
              onClose={() => setSelected(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function DailyTarget({
  bets,
  now,
  target,
  onChange,
}: {
  bets: BoardBet[]
  now: Date
  target: number
  onChange: (value: number) => void
}) {
  const reduced = useReducedMotion()
  const [editing, setEditing] = useState(false)
  const progress = useMemo(() => dailyProgress(bets, now), [bets, now])
  const reached = progress.count >= target
  const left = Math.max(0, target - progress.count)

  return (
    <div className="mt-4 rounded-2xl bg-stand p-4 hairline">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.85rem] text-haze">Dienos tikslas</p>
          <p className="mt-1 font-display text-[1.9rem] leading-none font-bold tnum">
            <NumberFlow value={progress.count} />
            <span className="text-haze"> iš {target}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.85rem] text-haze">Uždirbta vertės</p>
          <p className={`mt-1 font-display text-[1.9rem] leading-none font-bold tnum ${progress.value > 0 ? 'text-pitch' : 'text-haze'}`}>
            <NumberFlow
              value={progress.value}
              locales="lt-LT"
              format={{ minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' }}
              suffix=" €"
            />
          </p>
        </div>
      </div>
      <div
        role="progressbar"
        aria-label="Šiandien pažymėti statymai"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(progress.count, target)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-rail"
      >
        <motion.div
          className="h-full rounded-full bg-pitch"
          initial={false}
          animate={{ width: `${Math.min(1, progress.count / Math.max(1, target)) * 100}%` }}
          transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
        />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-[0.85rem]">
        {reached ? (
          <p className="flex items-center gap-1 font-medium text-pitch">
            <Check className="size-4" aria-hidden />
            Tikslas pasiektas
          </p>
        ) : (
          <p className="text-haze">
            Liko {left} {ltPlural(left, 'statymas', 'statymai', 'statymų')}
          </p>
        )}
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => setEditing((value) => !value)}
          className="font-medium text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk"
        >
          Keisti tikslą
        </button>
      </div>
      {editing && (
        <div className="mt-3 border-t border-rail pt-3">
          <ChipGroup
            label="Kiek statymų per dieną"
            options={DAILY_BET_CHOICES.map((value): { value: number; label: string } => ({ value, label: String(value) }))}
            value={target}
            onChange={(value) => {
              onChange(value)
              setEditing(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

function SignalRow({
  row,
  now,
  active,
  stake,
  limit,
  tracked,
  sameMatch,
  isHidden,
  onSelect,
  onToggleHidden,
}: {
  row: BoardRow
  now: Date
  active: boolean
  stake: number
  limit: number | undefined
  /** Euros already marked on this selection. */
  tracked: number
  /** Bets on other lines of this match. */
  sameMatch: number
  isHidden?: boolean
  onSelect: () => void
  onToggleHidden?: () => void
}) {
  const { signal, price } = row
  const open = signal.status === 'open'
  return (
    <li className="relative border-b border-rail last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className={`relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3 px-4 pt-3.5 pb-3 text-left transition-colors sm:px-6 ${active ? 'bg-stand' : 'hover:bg-stand/60'}`}
      >
        {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-chalk" />}
        <span className="pt-0.5">
          <BookMark book={price.book} />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{price.eventName}</span>
          {/* Several lines of one match are separate signals: the bet itself tells them apart. */}
          <span className="block truncate text-[0.9rem] text-chalk/85">{ltSelection(price.selectionLabel)}</span>
        </span>
        <span className="text-right">
          <span className="block font-display text-[1.55rem] leading-none font-bold tnum">{formatOdds(price.odds)}</span>
          <span className={`mt-1 block text-[0.9rem] font-semibold ${open ? 'text-floodlight' : 'text-haze-dim line-through'}`}>
            {formatEdge(price.edge)}
          </span>
        </span>
        <span className="col-span-2 col-start-2 mt-2 flex min-w-0 items-center gap-2 pr-8 text-[0.85rem]">
          <span className="min-w-0 truncate text-haze">
            {sportName(signal.sport)}, {open ? timeUntilLabel(signal.startsAt, now) : signal.status === 'started' ? 'prasidėjo' : 'užsidarė'}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-2">
            {sameMatch > 0 && tracked === 0 && (
              <span className="inline-flex items-center gap-1 text-warning" title="Jau statei šiose rungtynėse">
                <AlertTriangle className="size-3.5" aria-hidden />
                <span className="sr-only">Jau statei šiose rungtynėse</span>
              </span>
            )}
            {tracked > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-pitch-soft px-2 py-0.5 font-semibold text-pitch tnum">
                <Check className="size-3.5" aria-hidden />
                <span className="sr-only">Pažymėta</span>
                {formatEuro(tracked)}
              </span>
            ) : (
              open &&
              stake > 0 && (
                <span className="rounded-full bg-rail px-2 py-0.5 font-semibold tnum">
                  <span className="sr-only">Siūloma suma </span>
                  {formatEuro(stake)}
                </span>
              )
            )}
            {open && limit !== undefined && <span className="text-haze-dim">limitas {formatEuro(limit)}</span>}
          </span>
        </span>
      </button>
      {onToggleHidden && (
        <button
          type="button"
          onClick={onToggleHidden}
          aria-label={isHidden ? `Grąžinti į sąrašą: ${price.eventName}` : `Paslėpti: ${price.eventName}`}
          className="absolute right-2 bottom-2 grid size-8 place-items-center rounded-lg text-haze-dim transition-colors hover:bg-rail hover:text-chalk sm:right-4"
        >
          {isHidden ? <Eye className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
        </button>
      )}
    </li>
  )
}

function Collapsible({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="border-t border-rail">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-[0.95rem] text-haze hover:text-chalk sm:px-6"
      >
        {label}
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && children}
    </div>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-3 border-b border-rail bg-[rgb(245_165_36/0.1)] px-4 py-3 text-[0.9rem] text-warning sm:px-6">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
