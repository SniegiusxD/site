'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useAnimate, useDragControls } from 'framer-motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { AlertTriangle, Bell, Check, ChevronDown, Lock, RefreshCw, Plus, Search, Sparkles, Star, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { type BoardBet, boardStake, dailyProgress, exposureFor } from '@/lib/exposure'
import { formatEdge, formatOdds, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { FREE_MAX_EDGE, FREE_MAX_ODDS } from '@/lib/free-tier'
import type { LiveBoard, LiveSignal, LockedSignal } from '@/lib/live-signals'
import { driftOf, DRIFT_FLOOR, pollPulses, type Pulse } from '@/lib/price-movement'
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
import { DAILY_BET_CHOICES } from '@/lib/preferences'
import {
  bandFor,
  MARKET_FAMILIES,
  marketLabel,
  ODDS_BANDS,
  PERIODS,
  periodLabel,
} from '@/lib/signal-taxonomy'
import { sportName } from '@/lib/sports-lt'
import type { Access } from '@/lib/subscription'
import { PRICE_EUR_PER_MONTH, TRIAL_DAYS } from '@/lib/subscription'
import { useLastVisit } from '@/lib/use-last-visit'
import { stringSet, useStoredState } from '@/lib/use-stored-state'
import { useAccount } from './account-provider'
import { ChipGroup } from './chip-group'
import { FilterChip, FilterOption } from './filter-chip'
import { FirstSteps } from './first-steps'
import { MonthDialog } from './month-dialog'
import { SignalDetail } from './signal-detail'
import { SignalRow } from './signal-row'
import { TrialRecap } from './trial-recap'

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
const VIEW_KEY = 'board-view'
const SEEN_KEY = 'board-last-visit'
const PINNED_KEY = 'pinned-events'
// The fallback for a stored id list: one shared, never-mutated empty set.
const NO_IDS: Set<string> = new Set()
const SAVED_KEY = 'board-saved-views'

/** One fixture, however many lines of it are published. */
const pinKeyOf = (signal: LiveSignal) => signal.eventKey ?? `${signal.home ?? ''}|${signal.away ?? ''}`

/** A board the member named, so a routine does not have to be rebuilt each time. */
type SavedView = {
  name: string
  sort: SortKey
  drift: 'all' | 'down' | 'up'
  sports: string[]
  markets: string[]
  periods: string[]
  minEdge: number
  books: BookName[]
}

const NO_VIEWS: SavedView[] = []

/** Saved views that are still whole; one broken entry does not cost the rest. */
function parseSavedViews(value: unknown): SavedView[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string') return []
    const books = strings(item.books).filter((book): book is BookName => (BOOKS as readonly string[]).includes(book))
    return [
      {
        ...parseView(item)!,
        name: item.name,
        minEdge: typeof item.minEdge === 'number' ? item.minEdge : 0.02,
        // Applying a view with no book would empty the board; the filter never allows it.
        books: books.length ? books : [...BOOKS],
      },
    ]
  })
}

type SortKey = 'value' | 'new' | 'soon' | 'moving'
const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'value', label: 'Pagal vertę' },
  { key: 'new', label: 'Naujausi' },
  { key: 'soon', label: 'Greičiausiai prasideda' },
  { key: 'moving', label: 'Labiausiai juda' },
]

/** The filters and sort a member left the board with, on this device. */
type StoredView = { sort: SortKey; drift: 'all' | 'down' | 'up'; sports: string[]; markets: string[]; periods: string[] }
const DEFAULT_VIEW: StoredView = { sort: 'value', drift: 'all', sports: [], markets: [], periods: [] }

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])

/** Whatever part of a stored view still makes sense; the rest is the default. */
function parseView(value: unknown): StoredView | undefined {
  if (!value || typeof value !== 'object') return undefined
  const view = value as Record<string, unknown>
  return {
    sort: SORTS.find((option) => option.key === view.sort)?.key ?? 'value',
    drift: view.drift === 'down' || view.drift === 'up' ? view.drift : 'all',
    sports: strings(view.sports),
    markets: strings(view.markets),
    periods: strings(view.periods),
  }
}

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

/** Fixtures the member is watching. Keyed by event, so every line of the same match pins together. */
function usePinned() {
  const [pinned, setPinned] = useStoredState(PINNED_KEY, stringSet, NO_IDS)

  const toggle = useCallback(
    (key: string) =>
      setPinned((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      }),
    [setPinned],
  )

  return [pinned, toggle] as const
}

/** Signals the member hid on this device. A convenience only, so browser storage is fine. */
function useHiddenSignals(signals: LiveSignal[]) {
  const [stored, save] = useStoredState(HIDDEN_KEY, stringSet, NO_IDS)

  // Signals that left the board are forgotten here, and dropped from storage
  // with the next hide or restore, so the list does not grow forever.
  const hidden = useMemo(() => {
    if (stored.size === 0 || signals.length === 0) return stored
    const present = new Set(signals.map((signal) => signal.id))
    const kept = [...stored].filter((id) => present.has(id))
    return kept.length === stored.size ? stored : new Set(kept)
  }, [stored, signals])

  return [hidden, save] as const
}

export function SignalBoard({
  initial,
  initialBets,
  access,
  firstStepsDismissed = false,
  justUnlocked = false,
  link,
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
}) {
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
  const [search, setSearch] = useState('')
  const [onlyNew, setOnlyNew] = useState(false)
  // The moment this member last had the board open, on this device. Read once,
  // then frozen for the visit so rows do not stop being new while being read.
  const lastVisit = useLastVisit(SEEN_KEY)

  // The board a member left is the board they expect to come back to. Their own
  // device only: these are view choices, not account settings.
  const [view, setView] = useStoredState(VIEW_KEY, parseView, DEFAULT_VIEW)
  const { sort, drift, sports: sportsPicked, markets, periods } = view
  const { setSort, setDrift, setSportsPicked, setMarkets, setPeriods } = useMemo(() => {
    const field =
      <K extends keyof StoredView>(key: K) =>
      (next: StoredView[K] | ((current: StoredView[K]) => StoredView[K])) =>
        setView((current) => ({
          ...current,
          [key]: typeof next === 'function' ? (next as (value: StoredView[K]) => StoredView[K])(current[key]) : next,
        }))
    return {
      setSort: field('sort'),
      setDrift: field('drift'),
      setSportsPicked: field('sports'),
      setMarkets: field('markets'),
      setPeriods: field('periods'),
    }
  }, [setView])
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
  const [savedViews, writeViews] = useStoredState(SAVED_KEY, parseSavedViews, NO_VIEWS)
  const sheetDrag = useDragControls()

  // What changed since the previous poll: new signals glow once, moved prices flash up or down.
  const [pulses, setPulses] = useState<Map<string, Pulse>>(() => new Map())
  const shownBoard = useRef(initial)
  const pulseTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(pulseTimer.current), [])
  const showBoard = useCallback((next: LiveBoard) => {
    const changed = pollPulses(shownBoard.current.signals, next.signals)
    shownBoard.current = next
    setBoard(next)
    if (changed.size === 0) return
    setPulses(changed)
    window.clearTimeout(pulseTimer.current)
    pulseTimer.current = window.setTimeout(() => setPulses(new Map()), 4000)
  }, [])

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
      showBoard(await response.json())
      setLoadError(null)
    } catch {
      setLoadError('Nepavyko atnaujinti signalų. Bandysim dar kartą po minutės.')
    } finally {
      setRefreshing(false)
      setNow(new Date())
    }
  }, [router, refreshBets, showBoard])

  useEffect(() => {
    // A background tab does not need fresh odds: it polls again the moment it
    // comes back, so a hidden board stops asking.
    const poll = window.setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS)
    const tick = window.setInterval(() => document.visibilityState === 'visible' && setNow(new Date()), 30_000)
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

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
      sport,
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
      sport,
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

  function toggleBook(book: BookName) {
    const next = prefs.books.includes(book) ? prefs.books.filter((b) => b !== book) : BOOKS.filter((b) => b === book || prefs.books.includes(b))
    if (next.length === 0) return
    updateSettings({ books: next })
  }

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
  const addBet = useCallback((bet: BoardBet) => setBets((current) => [bet, ...current.filter((item) => item.id !== bet.id)]), [])
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

  const band = bandFor(prefs.minOdds, prefs.maxOdds) ?? bandFor(prefs.minOdds, 100)
  const listLabel = (keys: string[], label: (key: string) => string, all: string) =>
    keys.length === 0 ? all : keys.length <= 2 ? keys.map(label).join(', ') : `${keys.length} pasirinkti`
  const booksValue = prefs.books.length === BOOKS.length ? 'visos kontoros' : prefs.books.join(', ')
  const sportsValue = sport ? sportName(sport) : listLabel(sportsPicked, sportName, 'visi sportai')
  const marketsValue = listLabel(markets, marketLabel, 'visos rinkos')
  const periodsValue = listLabel(periods, periodLabel, 'visi periodai')

  const status = board.status
  const stale = status ? isStale(status.publishedAt, now) : false
  const best = visible[0]?.price.edge

  const movementFor = (row: BoardRow) => board.movement?.[row.signal.id]?.[row.price.book]

  function renderRow(row: BoardRow, options: { isHidden?: boolean; enterIndex?: number } = {}) {
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
    <main className="lg:grid lg:h-dvh lg:grid-cols-[minmax(0,29rem)_minmax(0,1fr)]">
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
              <FilterChip label="Išsaugoti vaizdai" value={savedViews.length ? `Vaizdai ${savedViews.length}` : 'Vaizdai'} active={false}>
                {savedViews.length === 0 && (
                  <p className="px-2.5 pb-2 text-[0.85rem] text-haze">
                    Susidėliok filtrus ir išsaugok — grįžęs rasi tokį patį sąrašą.
                  </p>
                )}
                {savedViews.map((view) => (
                  <div key={view.name} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSort(view.sort)
                        setDrift(view.drift)
                        setSportsPicked(view.sports)
                        setMarkets(view.markets)
                        setPeriods(view.periods)
                        setSport(null)
                        updateSettings({ minEdge: view.minEdge, books: view.books })
                      }}
                      className="min-h-11 flex-1 truncate rounded-xl px-2.5 text-left text-[0.9rem] text-chalk hover:bg-stand-hover"
                    >
                      {view.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Pašalinti vaizdą ${view.name}`}
                      onClick={() => writeViews(savedViews.filter((saved) => saved.name !== view.name))}
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-haze-dim hover:bg-rail hover:text-chalk"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt('Vaizdo pavadinimas', 'Krepšinis 3 %+')?.trim()
                    if (!name) return
                    const view: SavedView = {
                      name: name.slice(0, 40),
                      sort,
                      drift,
                      sports: sportsPicked,
                      markets,
                      periods,
                      minEdge: prefs.minEdge,
                      books: prefs.books,
                    }
                    writeViews([...savedViews.filter((saved) => saved.name !== view.name), view].slice(-8))
                  }}
                  className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl bg-stand-hover px-2.5 text-[0.9rem] font-medium text-chalk"
                >
                  <Plus className="size-4" aria-hidden />
                  Išsaugoti dabartinį
                </button>
              </FilterChip>

              <FilterChip label="Rikiuoti" value={SORTS.find((option) => option.key === activeSort)!.label} active={activeSort !== 'value'}>
                {SORTS.filter((option) => !(freeTier && option.key === 'moving')).map((option) => (
                  <FilterOption
                    key={option.key}
                    label={option.label}
                    checked={activeSort === option.key}
                    onChange={() => setSort(option.key)}
                  />
                ))}
              </FilterChip>
            </div>

            {/* Always visible, the way a member actually works: narrow, look, widen. */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <FilterChip label="Kontoros" value={prefs.books.length < BOOKS.length ? booksValue : 'Kontoros'} active={prefs.books.length < BOOKS.length}>
                {BOOKS.map((book) => (
                  <FilterOption
                    key={book}
                    label={book}
                    multiple
                    count={counts.books[book]}
                    checked={prefs.books.includes(book)}
                    onChange={() => toggleBook(book)}
                  />
                ))}
              </FilterChip>

              <FilterChip label="Sportas" value={sportsPicked.length || sport ? sportsValue : 'Sportas'} active={sportsPicked.length > 0 || sport !== null}>
                <FilterOption
                  label="Visi sportai"
                  checked={sportsPicked.length === 0}
                  onChange={() => {
                    setSportsPicked([])
                    setSport(null)
                  }}
                />
                {onBoard.map((key) => (
                  <FilterOption
                    key={key}
                    label={sportName(key)}
                    multiple
                    count={counts.sports[key]}
                    checked={sportsPicked.includes(key)}
                    onChange={() => {
                      setSport(null)
                      setSportsPicked((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
                    }}
                  />
                ))}
              </FilterChip>

              <FilterChip label="Laikas iki rungtynių" value={`${prefs.maxHoursToStart} val.`} active>
                {HOUR_CHOICES.map((choice) => (
                  <FilterOption
                    key={choice.value}
                    label={`per ${choice.label}`}
                    checked={prefs.maxHoursToStart === choice.value}
                    onChange={() => updateSettings({ maxHoursToStart: choice.value })}
                  />
                ))}
              </FilterChip>

              {freeTier ? (
                <span className="inline-flex min-h-11 items-center rounded-full px-4 text-[0.9rem] text-haze hairline">
                  vertė iki {formatEdge(FREE_MAX_EDGE)}
                </span>
              ) : (
                <FilterChip label="Vertė" value={`${Math.round(prefs.minEdge * 100)} %+`} active>
                  {EDGE_CHOICES.map((value) => (
                    <FilterOption
                      key={value}
                      label={`${Math.round(value * 100)} %+`}
                      checked={Math.abs(prefs.minEdge - value) < 0.0001}
                      onChange={() => updateSettings({ minEdge: value })}
                    />
                  ))}
                </FilterChip>
              )}

              <FilterChip label="Koeficientai" value={band && band.key !== 'all' ? band.label : 'Koef.'} active={band?.key !== 'all'}>
                {ODDS_BANDS.map((option) => (
                  <FilterOption
                    key={option.key}
                    label={option.label}
                    checked={band?.key === option.key}
                    onChange={() => updateSettings({ minOdds: option.min, maxOdds: option.key === 'all' ? 6 : option.max })}
                  />
                ))}
              </FilterChip>

              <FilterChip label="Rinka" value={markets.length ? marketsValue : 'Rinka'} active={markets.length > 0}>
                <FilterOption label="Visos rinkos" checked={markets.length === 0} onChange={() => setMarkets([])} />
                {MARKET_FAMILIES.map((family) => (
                  <FilterOption
                    key={family.key}
                    label={family.label}
                    multiple
                    count={counts.markets[family.key]}
                    checked={markets.includes(family.key)}
                    onChange={() =>
                      setMarkets((current) => (current.includes(family.key) ? current.filter((item) => item !== family.key) : [...current, family.key]))
                    }
                  />
                ))}
              </FilterChip>

              <FilterChip
                label="Kainos judėjimas"
                value={activeDrift === 'all' ? 'Judėjimas' : activeDrift === 'down' ? 'Krenta' : 'Kyla'}
                active={activeDrift !== 'all'}
              >
                {freeTier ? (
                  // What the tool does, without a single real event, book or price.
                  <div className="max-w-[18rem] p-2">
                    <p className="flex items-center gap-2 font-medium">
                      <Lock className="size-4 text-haze" aria-hidden />
                      Pilnos prieigos įrankis
                    </p>
                    <p className="mt-1.5 text-[0.9rem] text-haze">
                      Rodo, kurių signalų kaina krenta ar kyla tarp skenavimų: krentanti kaina dažnai reiškia, kad vertė netrukus užsidarys.
                    </p>
                    <Link href="/atrakinti" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-floodlight px-3 text-[0.9rem] font-semibold text-night">
                      Atrakinti
                    </Link>
                  </div>
                ) : (
                  <>
                    <FilterOption label="Visos" checked={drift === 'all'} onChange={() => setDrift('all')} />
                    <FilterOption label="Kaina krenta" checked={drift === 'down'} onChange={() => setDrift('down')} />
                    <FilterOption label="Kaina kyla" checked={drift === 'up'} onChange={() => setDrift('up')} />
                  </>
                )}
              </FilterChip>

              <FilterChip label="Periodas" value={periods.length ? periodsValue : 'Periodas'} active={periods.length > 0}>
                <FilterOption label="Visi periodai" checked={periods.length === 0} onChange={() => setPeriods([])} />
                {PERIODS.map((period) => (
                  <FilterOption
                    key={period.key}
                    label={period.label}
                    multiple
                    count={counts.periods[period.key]}
                    checked={periods.includes(period.key)}
                    onChange={() =>
                      setPeriods((current) => (current.includes(period.key) ? current.filter((item) => item !== period.key) : [...current, period.key]))
                    }
                  />
                ))}
              </FilterChip>
            </div>
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
            <ul>
              <AnimatePresence key={unlockedAt ?? 'board'} initial={unlockedAt !== null && !reduced}>
                {visible.map((row, index) => renderRow(row, { enterIndex: index }))}
              </AnimatePresence>
            </ul>
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

function DailyTarget({
  ref,
  bump = 0,
  bets,
  now,
  target,
  onChange,
}: {
  /** The count the "+1 statymas" pill lands on. */
  ref?: React.Ref<HTMLDivElement>
  /** Changes when a pill lands; the card answers with a small bump. */
  bump?: number
  bets: BoardBet[]
  now: Date
  target: number
  onChange: (value: number) => void
}) {
  const reduced = useReducedMotion()
  const [card, animateCard] = useAnimate()
  useEffect(() => {
    if (!bump || reduced || !card.current) return
    animateCard(card.current, { scale: [1, 1.035, 1] }, { duration: 0.42, ease: EASE })
  }, [bump, reduced, animateCard, card])
  const [editing, setEditing] = useState(false)
  const [monthOpen, setMonthOpen] = useState(false)
  const closeMonth = useCallback(() => setMonthOpen(false), [])
  const progress = useMemo(() => dailyProgress(bets, now), [bets, now])
  const reached = progress.count >= target
  const left = Math.max(0, target - progress.count)

  return (
    <div ref={card} className="mt-4 rounded-2xl bg-stand p-4 hairline">
      <div className="flex items-start justify-between gap-4">
        <div ref={ref}>
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
        <button
          type="button"
          onClick={() => setMonthOpen(true)}
          className="font-medium text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk"
        >
          Mėnuo
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
      <MonthDialog open={monthOpen} onClose={closeMonth} dailyTarget={target} now={now} />
    </div>
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

/**
 * Free accounts: what a subscription would open. Only the value, the odds, the
 * sport and the kickoff are here — the match, the market and the book never
 * reach the browser, so nothing in this strip can be turned into a bet.
 */
function LockedStrip({ locked, access, onUnlocked }: { locked: LockedSignal[]; access: Access; onUnlocked: () => void }) {
  const [starting, setStarting] = useState(false)
  const shown = locked.slice(0, 4)
  const rest = locked.length - shown.length

  async function startTrial() {
    setStarting(true)
    try {
      const response = await fetch('/api/trial', { method: 'POST' })
      if (!response.ok) throw new Error(String(response.status))
      onUnlocked()
    } catch {
      toast.error('Nepavyko pradėti bandymo. Bandyk dar kartą.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <section aria-label="Užrakinti signalai" className="border-b border-rail bg-stand/40 px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-[1.05rem] font-semibold">
          <Lock className="size-4 text-haze" aria-hidden />
          Užrakinta
        </h2>
        <p className="text-[0.9rem] text-haze tnum">
          {locked.length} {ltPlural(locked.length, 'signalas', 'signalai', 'signalų')}
        </p>
      </div>
      <p className="mt-1.5 text-[0.9rem] text-haze">
        Nemokamai matai signalus iki {formatEdge(FREE_MAX_EDGE)} vertės ir iki {formatOdds(FREE_MAX_ODDS)} koeficiento. Didesni laukia čia.
      </p>

      <ul className="mt-3.5 space-y-1.5">
        {shown.map((signal) => (
          <li key={signal.id} className="flex items-center gap-3 rounded-xl bg-night px-3 py-2.5">
            <span className="min-w-0 flex-1" aria-hidden>
              <span className="block h-3 w-[70%] rounded-full bg-rail/80 blur-[2px]" />
              <span className="mt-1.5 block h-2.5 w-[45%] rounded-full bg-rail/50 blur-[2px]" />
            </span>
            <span className="sr-only">{sportName(signal.sport)}, užrakintas signalas</span>
            <span className="shrink-0 text-right">
              <span className="block font-semibold text-floodlight tnum">{formatEdge(signal.bestEdge)}</span>
              <span className="block text-[0.8rem] text-haze tnum">koef. {formatOdds(signal.bestOdds)}</span>
            </span>
          </li>
        ))}
      </ul>
      {rest > 0 && <p className="mt-2 text-[0.875rem] text-haze tnum">ir dar {rest}</p>}

      {access.canStartTrial ? (
        <button
          type="button"
          onClick={startTrial}
          disabled={starting}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-floodlight font-semibold text-night transition-colors hover:bg-pitch disabled:opacity-70"
        >
          {starting ? 'Atrakinam…' : `Atrakinti ${TRIAL_DAYS} dienoms nemokamai`}
        </button>
      ) : (
        <Link
          href="/atrakinti"
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-floodlight font-semibold text-night transition-colors hover:bg-pitch"
        >
          Atrakinti už {PRICE_EUR_PER_MONTH} € per mėnesį
        </Link>
      )}
      <p className="mt-2 text-center text-[0.85rem] text-haze">
        {access.canStartTrial ? 'Kortelės nereikia.' : 'Atšaukti gali bet kada.'}
      </p>
    </section>
  )
}
