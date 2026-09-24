'use client'

import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { Bell, Check, RefreshCw, Search, Sparkles, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { type BoardBet, boardStake, exposureFor } from '@/lib/exposure'
import { formatEdge, ltPlural } from '@/lib/format-lt'
import { BOOKS } from '@/lib/landing-signals'
import { FREE_MAX_ODDS } from '@/lib/free-tier'
import type { LiveBoard } from '@/lib/live-signals'
import { driftOf, DRIFT_FLOOR } from '@/lib/price-movement'
import {
  agoLabel,
  type BoardFilters,
  type BoardRow,
  boardRows,
  clockLabel,
  isStale,
  linkedRow,
  sportsIn,
} from '@/lib/live-view'
import type { Density } from '@/lib/board-density'
import { MARKET_FAMILIES, PERIODS } from '@/lib/signal-taxonomy'
import { sportName } from '@/lib/sports-lt'
import type { Access } from '@/lib/subscription'
import { TRIAL_DAYS } from '@/lib/subscription'
import { reportExecution } from '@/lib/report-execution'
import { useLastVisit } from '@/lib/use-last-visit'
import { useAccount } from './account-provider'
import { FirstSteps } from './first-steps'
import { SignalDetail } from './signal-detail'
import { CompactHeader, CompactSignalRow, SignalRow } from './signal-row'
import { Segmented } from './segmented'
import { TrialRecap } from './trial-recap'
import { DailyTarget } from './board/daily-target'
import { Collapsible, Notice } from './board/list-parts'
import { FilterChips, SavedViewsChip, SortChip } from './board/filters'
import { LockedStrip } from './board/locked-strip'
import { useLiveBoard } from './board/use-live-board'
import { pinKeyOf, SEEN_KEY, type SortKey, useBoardView, useDensity, useHiddenSignals, usePinned } from './board/use-board-preferences'

const EASE = [0.22, 1, 0.36, 1] as const
const DENSITIES: Array<{ value: Density; label: string }> = [
  { value: 'normal', label: 'Įprastas' },
  { value: 'compact', label: 'Kompaktiškas' },
]
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

export function SignalBoard({
  initial,
  initialBets,
  access,
  firstStepsDismissed = false,
  justUnlocked = false,
  link,
  initialDensity = 'normal',
}: {
  initial: LiveBoard
  initialBets: BoardBet[]
  access: Access
  /** From the kr-first-steps cookie, so the checklist is right in the first frame. */
  firstStepsDismissed?: boolean
  /** The trial started a moment ago on the unlock page (?atrakinta=1). */
  justUnlocked?: boolean
  /** ?signal=<id>&book=<book>: open this signal's detail first. */
  link?: { signal?: string; book?: string }
  /** From the kr-board-density cookie, so the chosen density is there in the first frame. */
  initialDensity?: Density
}) {
  const router = useRouter()
  const reduced = useReducedMotion()
  const desktop = useIsDesktop()
  const { account, updateSettings, saveError } = useAccount()
  const prefs = account.preferences

  const { board, bets, addBet, now, refreshing, loadError, pulses, refresh, refreshBets } = useLiveBoard(initial, initialBets)
  const [search, setSearch] = useState('')
  const [onlyNew, setOnlyNew] = useState(false)
  // The moment this member last had the board open, on this device. Read once,
  // then frozen for the visit so rows do not stop being new while being read.
  const lastVisit = useLastVisit(SEEN_KEY)

  // The board a member left is the board they expect to come back to.
  const { sort, drift, sports: sportsPicked, markets, periods } = useBoardView()
  const [density, chooseDensity] = useDensity(initialDensity)
  const compact = density === 'compact'
  const [showClosed, setShowClosed] = useState(false)
  const [showHidden, setShowHidden] = useState(false)
  // The moment the trial starts: the newly visible signals rise in one after
  // another, once. Set from the unlock page (?atrakinta=1) or the locked strip.
  // Read on the server from ?atrakinta=1, so the confirmation line is there in
  // the first frame and stays: appearing or leaving later would shift the list.
  const [unlockedAt, setUnlockedAt] = useState<number | null>(justUnlocked ? 1 : null)
  const [hidden, setHidden] = useHiddenSignals(board.signals)
  const [pinned, togglePinned] = usePinned()
  const [onlyPinned, setOnlyPinned] = useState(false)
  const sheetDrag = useDragControls()

  // On the free board every signal is below the member's usual value floor, so
  // their own filter would empty the page. The free ceilings replace it.
  const freeTier = board.tier === 'free'
  // Price movement is part of the full board; the free board never receives it.
  // A filter or sort remembered from a trial would only empty the list.
  const activeDrift = freeTier ? 'all' : drift
  const activeSort: SortKey = freeTier && sort === 'moving' ? 'value' : sort
  // Memoised as one object so everything below can depend on it directly,
  // rather than on a JSON.stringify of it.
  const filters: BoardFilters = useMemo(
    () => ({
      books: prefs.books,
      minEdge: freeTier ? 0 : prefs.minEdge,
      minOdds: prefs.minOdds,
      maxOdds: freeTier ? Math.min(prefs.maxOdds, FREE_MAX_ODDS) : prefs.maxOdds,
      maxHoursToStart: prefs.maxHoursToStart,
      sport: null,
      sports: sportsPicked,
      markets,
      periods,
    }),
    [
      prefs.books,
      prefs.minEdge,
      prefs.minOdds,
      prefs.maxOdds,
      prefs.maxHoursToStart,
      freeTier,
      sportsPicked,
      markets,
      periods,
    ],
  )
  const rows = useMemo(() => boardRows(board.signals, filters, now), [board.signals, filters, now])
  const visible = useMemo(() => {
    let kept = rows.open.filter((row) => !hidden.has(row.signal.id))

    if (activeDrift !== 'all') {
      kept = kept.filter((row) => {
        const movement = board.movement?.[row.signal.id]?.[row.price.book]
        if (!movement) return false
        const change = driftOf(movement)
        return activeDrift === 'down' ? change <= -DRIFT_FLOOR : change >= DRIFT_FLOOR
      })
    }

    if (onlyNew && lastVisit) kept = kept.filter((row) => Date.parse(row.signal.firstSeenAt) > lastVisit)

    const needle = search.trim().toLowerCase()
    if (needle) {
      kept = kept.filter((row) =>
        `${row.price.eventName} ${row.price.selectionLabel} ${sportName(row.signal.sport)}`.toLowerCase().includes(needle),
      )
    }

    const movementOf = (row: BoardRow) => {
      const movement = board.movement?.[row.signal.id]?.[row.price.book]
      return movement ? Math.abs(driftOf(movement)) : -1
    }
    if (onlyPinned) kept = kept.filter((row) => pinned.has(pinKeyOf(row.signal)))

    const sorted = [...kept]
    if (activeSort === 'value') sorted.sort((a, b) => b.price.edge - a.price.edge)
    if (activeSort === 'new') sorted.sort((a, b) => new Date(b.signal.firstSeenAt).getTime() - new Date(a.signal.firstSeenAt).getTime())
    if (activeSort === 'soon') sorted.sort((a, b) => new Date(a.signal.startsAt).getTime() - new Date(b.signal.startsAt).getTime())
    if (activeSort === 'moving') sorted.sort((a, b) => movementOf(b) - movementOf(a))
    // Whatever the sort, a watched fixture is what the member came back for.
    sorted.sort((a, b) => Number(pinned.has(pinKeyOf(b.signal))) - Number(pinned.has(pinKeyOf(a.signal))))
    return sorted
  }, [rows.open, hidden, activeDrift, board.movement, search, activeSort, onlyNew, lastVisit, pinned, onlyPinned])

  // How many the member has not seen yet, whether or not the filter is on.
  const newCount = useMemo(
    () => (lastVisit ? rows.open.filter((row) => Date.parse(row.signal.firstSeenAt) > lastVisit).length : 0),
    [rows.open, lastVisit],
  )
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
  const signalsById = useMemo(() => new Map(board.signals.map((signal) => [signal.id, signal])), [board.signals])
  // A link straight to one signal: /signalai?signal=<id>&book=<book>. Telegram
  // alerts and shared links land on the detail rather than on the board. Read
  // from the server's search params once, against the first board.
  const [selected, setSelected] = useState<BoardRow | null>(() => linkedRow(rows, link?.signal, link?.book))

  // Keep the open detail in sync with fresh data; if the signal left the
  // board entirely, keep showing the last copy (it renders as closed).
  const selectedRow = useMemo(() => {
    if (!selected) return null
    const fresh = [...rows.open, ...rows.closed].find((row) => row.signal.id === selected.signal.id)
    if (fresh) return fresh
    return { signal: { ...selected.signal, status: 'closed' as const, closedAt: selected.signal.closedAt ?? now.toISOString() }, price: selected.price }
  }, [selected, rows, now])

  // On desktop the detail pane is always beside the list, so it opens on the
  // top signal. Adjusted during render (React re-renders before painting), and
  // then it is an ordinary selection that a re-sort or a poll does not move.
  if (desktop && !selected && visible[0]) setSelected(visible[0])

  // After the first render the address follows the selection, so a refresh or
  // a copied link opens the same signal.
  useEffect(() => {
    const target = selected
      ? `/signalai?signal=${encodeURIComponent(selected.signal.id)}&book=${encodeURIComponent(selected.price.book)}`
      : '/signalai'
    if (window.location.pathname + window.location.search !== target) window.history.replaceState(null, '', target)
  }, [selected])

  // The undo button in a toast runs later; it must see signals hidden since.
  const hiddenRef = useRef(hidden)
  useEffect(() => {
    hiddenRef.current = hidden
  }, [hidden])

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

  // "+1 statymas": a pill flies from where the bet was recorded into the daily
  // target, which bumps as it lands. Only when both ends are on screen (the
  // phone sheet covers the target) and never in calm mode.
  const targetRef = useRef<HTMLDivElement>(null)
  const [flight, setFlight] = useState<{ bet: BoardBet; from: { x: number; y: number }; to: { x: number; y: number } } | null>(null)
  const [bump, setBump] = useState(0)
  const onTracked = useCallback(
    (bet: BoardBet, from?: DOMRect) => {
      const to = targetRef.current?.getBoundingClientRect()
      const onScreen = (rect?: DOMRect): rect is DOMRect => Boolean(rect && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight)
      if (!reduced && from && from.width > 0 && onScreen(to)) {
        // Kept inside the screen: the detail can scroll between click and save.
        const fromY = Math.min(window.innerHeight - 40, Math.max(40, from.top + from.height / 2))
        setFlight({ bet, from: { x: from.left + from.width / 2, y: fromY }, to: { x: to.left + to.width / 2, y: to.top + to.height / 2 } })
        // The server copy arrives after the landing, so the count moves once.
        window.setTimeout(refreshBets, 1000)
      } else {
        addBet(bet)
        refreshBets()
      }
    },
    [addBet, refreshBets, reduced],
  )
  // The count changes when the pill lands, not when it leaves.
  const land = useCallback(() => {
    setFlight((current) => {
      if (current) addBet(current.bet)
      return null
    })
    setBump((value) => value + 1)
  }, [addBet])

  const onBoard = sportsIn(board.signals)

  // What each choice would leave, with every other filter still applied, so a
  // member can see that "Tenisas" is empty before choosing it.
  const counts = useMemo(() => {
    const countWith = (patch: Partial<BoardFilters>) => boardRows(board.signals, { ...filters, ...patch }, now).open.length
    return {
      sports: Object.fromEntries(onBoard.map((key) => [key, countWith({ sports: [key], sport: null })])),
      markets: Object.fromEntries(MARKET_FAMILIES.map((family) => [family.key, countWith({ markets: [family.key] })])),
      periods: Object.fromEntries(PERIODS.map((period) => [period.key, countWith({ periods: [period.key] })])),
      books: Object.fromEntries(BOOKS.map((book) => [book, countWith({ books: [book] })])),
    }
  }, [board.signals, filters, now, onBoard])

  const status = board.status
  const stale = status ? isStale(status.publishedAt, now) : false
  const best = visible[0]?.price.edge

  const movementFor = (row: BoardRow) => board.movement?.[row.signal.id]?.[row.price.book]

  function renderRow(row: BoardRow, options: { isHidden?: boolean; enterIndex?: number } = {}) {
    const exposure = exposureFor(row.signal, bets, signalsById)
    const { suggested } = boardStake(prefs, row.signal, row.price, exposure)
    if (compact) {
      return (
        <CompactSignalRow
          key={row.signal.id}
          row={row}
          now={now}
          active={selectedRow?.signal.id === row.signal.id}
          stake={suggested}
          tracked={exposure.selection.staked}
          sameMatch={exposure.match.count}
          isHidden={options.isHidden}
          pulse={pulses.get(row.signal.id) ?? pulses.get(`${row.signal.id}:${row.price.book}`)}
          pinned={pinned.has(pinKeyOf(row.signal))}
          onTogglePinned={() => togglePinned(pinKeyOf(row.signal))}
          onSelect={() => setSelected(row)}
          onToggleHidden={row.signal.status === 'open' ? () => (options.isHidden ? unhide(row) : hide(row)) : undefined}
          onCopied={() => reportExecution('copy_event', row.signal, row.price)}
        />
      )
    }
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
        enterDelay={unlockedAt !== null && !reduced && options.enterIndex !== undefined ? Math.min(options.enterIndex, 12) * 0.045 : 0}
        pulse={pulses.get(row.signal.id) ?? pulses.get(`${row.signal.id}:${row.price.book}`)}
        movement={movementFor(row)}
        pinned={pinned.has(pinKeyOf(row.signal))}
        onTogglePinned={() => togglePinned(pinKeyOf(row.signal))}
        onSelect={() => setSelected(row)}
        onToggleHidden={row.signal.status === 'open' ? () => (options.isHidden ? unhide(row) : hide(row)) : undefined}
      />
    )
  }

  return (
    <main
      className={`lg:grid lg:h-dvh ${
        compact
          ? 'lg:grid-cols-[minmax(0,44rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,52rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,60rem)_minmax(0,1fr)]'
          : 'lg:grid-cols-[minmax(0,29rem)_minmax(0,1fr)]'
      }`}
    >
      <section aria-label="Signalų sąrašas" className="flex min-h-0 flex-col lg:border-r lg:border-rail">
        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          <div className="border-b border-rail px-4 pt-5 pb-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="flex items-baseline gap-3">
                <h1 className="text-[1.9rem]">Signalai</h1>
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
                <Segmented
                  label="Sąrašo tankis"
                  options={DENSITIES}
                  value={density}
                  onChange={chooseDensity}
                  size="sm"
                />
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

            <DailyTarget
              ref={targetRef}
              bump={bump}
              bets={bets}
              now={now}
              target={prefs.dailyBets}
              onChange={(dailyBets) => updateSettings({ dailyBets })}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-haze-dim" aria-hidden />
                <span className="sr-only">Ieškoti komandos ar rungtynių</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Ieškoti komandos…"
                  className="h-11 w-full rounded-full bg-stand pr-3 pl-9 text-[0.95rem] text-chalk hairline placeholder:text-haze-dim"
                />
              </label>
              {pinned.size > 0 && (
                <button
                  type="button"
                  aria-pressed={onlyPinned}
                  onClick={() => setOnlyPinned((value) => !value)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.9rem] font-medium transition-colors ${
                    onlyPinned ? 'bg-chalk text-night' : 'bg-stand text-chalk hairline hover:bg-stand-hover'
                  }`}
                >
                  <Star className="size-4" aria-hidden />
                  Sekami {pinned.size}
                </button>
              )}
              {newCount > 0 && (
                <button
                  type="button"
                  aria-pressed={onlyNew}
                  onClick={() => setOnlyNew((value) => !value)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[0.9rem] font-medium transition-colors ${
                    onlyNew ? 'bg-floodlight text-night' : 'bg-stand text-chalk hairline hover:bg-stand-hover'
                  }`}
                >
                  <Sparkles className="size-4" aria-hidden />
                  Nauji {newCount}
                </button>
              )}
              <SavedViewsChip />
              <SortChip freeTier={freeTier} />
            </div>
            <FilterChips freeTier={freeTier} counts={counts} onBoard={onBoard} />

            {saveError && <p className="mt-3 text-[0.9rem] text-brick">{saveError}</p>}
          </div>

          {status && !status.sharpAvailable && (
            <Notice>
              Pinnacle šiuo metu nepasiekiamas, todėl kainos neatnaujinamos nuo {clockLabel(status.publishedAt)}. Prieš statydamas
              patikrink koeficientą kontoroje.
            </Notice>
          )}
          {status?.sharpAvailable && stale && (
            <Notice>
              Paskutinis skenavimas {clockLabel(status.publishedAt)}, {agoLabel(status.publishedAt, now).replace(/\.$/, '')}. Kainos galėjo pasikeisti.
            </Notice>
          )}
          {loadError && <Notice>{loadError}</Notice>}

          {board.tier === 'free' && access.state === 'expired' && <TrialRecap />}
          <FirstSteps bets={bets} initiallyDismissed={firstStepsDismissed} />

          {board.tier === 'free' && (
            <LockedStrip
              locked={board.locked ?? []}
              access={access}
              onUnlocked={() => {
                refresh()
                router.refresh()
                setUnlockedAt(Date.now())
              }}
            />
          )}

          <AnimatePresence>
            {unlockedAt !== null && (
              <motion.p
                role="status"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="flex items-center gap-2 border-b border-rail bg-floodlight-soft/60 px-4 py-3 text-[0.95rem] font-medium sm:px-6"
              >
                <Sparkles className="size-4 shrink-0 text-floodlight" aria-hidden />
                Atrakinta {TRIAL_DAYS} dienoms: dabar matai {visible.length} {ltPlural(visible.length, 'signalą', 'signalus', 'signalų')}.
              </motion.p>
            )}
          </AnimatePresence>

          {visible.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-display text-3xl font-bold">
                {status ? 'Šiuo metu signalų nėra' : 'Signalai dar neskelbiami'}
              </p>
              <p className="mx-auto mt-3 max-w-[22rem] text-haze">
                {onlyNew
                  ? 'Nuo paskutinio apsilankymo naujų signalų nėra. Išjunk „Nauji“, kad matytum visus.'
                  : search.trim()
                  ? `Pagal „${search.trim()}“ nieko neradom. Pabandyk kitą komandos pavadinimą.`
                  : activeDrift !== 'all'
                  ? 'Kainų judėjimą matom tik tuose signaluose, kuriuos matėm bent dviejuose skenavimuose. Palauk kito skenavimo arba grąžink filtrą į „Visos“.'
                  : !status
                  ? 'Kai tik ateis pirmas skenavimas, signalai atsiras čia patys.'
                  : hiddenRows.length > 0 && rows.open.length === hiddenRows.length
                    ? 'Visus atvirus signalus paslėpei. Juos grąžinsi apačioje.'
                    : looseCount > 0
                      ? `Pagal tavo filtrus nieko nėra, bet iš viso atviri ${looseCount} ${ltPlural(looseCount, 'signalas', 'signalai', 'signalų')}. Pakeisk filtrus arba kontoras.`
                      : 'Naujas skenavimas vyksta maždaug kas 40 minučių. Puslapis atsinaujins pats.'}
              </p>
            </div>
          ) : (
            <>
              {compact && <CompactHeader />}
              <ul>
                <AnimatePresence key={unlockedAt ?? 'board'} initial={unlockedAt !== null && !reduced}>
                  {visible.map((row, index) => renderRow(row, { enterIndex: index }))}
                </AnimatePresence>
              </ul>
            </>
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
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${selectedRow.signal.id}-${selectedRow.price.book}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <SignalDetail
                signal={selectedRow.signal}
                price={selectedRow.price}
                now={now}
                bets={bets}
                signalsById={signalsById}
                movement={movementFor(selectedRow)}
                onTracked={onTracked}
              />
            </motion.div>
          </AnimatePresence>
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

      {/* "+1 statymas": from the recorded bet to the daily target, in a low arc. */}
      <AnimatePresence>
        {flight && (
          <motion.div
            key={flight.bet.id}
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 z-[60] -translate-x-1/2 -translate-y-1/2"
            initial={{ x: flight.from.x, y: flight.from.y, scale: 0.85, opacity: 0 }}
            animate={{
              x: [flight.from.x, (flight.from.x + flight.to.x) / 2, flight.to.x],
              y: [flight.from.y, Math.min(flight.from.y, flight.to.y) - 70, flight.to.y],
              scale: [0.85, 1.05, 0.55],
              opacity: [0, 1, 0.15],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.45, 0, 0.2, 1], times: [0, 0.45, 1] }}
            onAnimationComplete={land}
          >
            <span className="flex items-center gap-1.5 rounded-full bg-floodlight px-3.5 py-2 text-[0.95rem] font-semibold whitespace-nowrap text-night shadow-[0_12px_30px_-10px_rgb(91_229_132/0.7)]">
              <Check className="size-4" strokeWidth={3} aria-hidden />
              +1 statymas
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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
            // Pull the handle down to close; only the handle starts a drag, so the content still scrolls.
            drag={reduced ? false : 'y'}
            dragControls={sheetDrag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) setSelected(null)
            }}
            className="fixed inset-0 z-50 overflow-y-auto bg-night"
          >
            <div
              onPointerDown={(event) => sheetDrag.start(event)}
              className="sticky top-0 z-20 flex h-7 touch-none items-center justify-center bg-night"
            >
              <span aria-hidden className="h-1 w-10 rounded-full bg-rail-strong" />
            </div>
            <SignalDetail
              key={`${selectedRow.signal.id}-${selectedRow.price.book}`}
              signal={selectedRow.signal}
              price={selectedRow.price}
              now={now}
              bets={bets}
              signalsById={signalsById}
              movement={movementFor(selectedRow)}
              onTracked={onTracked}
              onClose={() => setSelected(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

