'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, ChevronDown, RefreshCw, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { formatEdge, formatOdds, ltPlural } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import type { LiveBoard } from '@/lib/live-signals'
import {
  agoLabel,
  type BoardFilters,
  type BoardRow,
  boardRows,
  clockLabel,
  isStale,
  sportsIn,
  timeUntilLabel,
} from '@/lib/live-view'
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

export function SignalBoard({ initial }: { initial: LiveBoard }) {
  const router = useRouter()
  const reduced = useReducedMotion()
  const desktop = useIsDesktop()
  const { account, updateSettings, saveError } = useAccount()
  const prefs = account.preferences

  const [board, setBoard] = useState(initial)
  const [now, setNow] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sport, setSport] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [selected, setSelected] = useState<BoardRow | null>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/live', { cache: 'no-store' })
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
  }, [router])

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

  // Keep the open detail in sync with fresh data; if the signal left the
  // board entirely, keep showing the last copy (it renders as closed).
  const selectedRow = useMemo(() => {
    if (!selected) return null
    const fresh = [...rows.open, ...rows.closed].find((row) => row.signal.id === selected.signal.id)
    if (fresh) return fresh
    return { signal: { ...selected.signal, status: 'closed' as const, closedAt: selected.signal.closedAt ?? now.toISOString() }, price: selected.price }
  }, [selected, rows, now])

  useEffect(() => {
    if (desktop && !selected && rows.open[0]) setSelected(rows.open[0])
  }, [desktop, selected, rows.open])

  function toggleBook(book: BookName) {
    const next = prefs.books.includes(book) ? prefs.books.filter((b) => b !== book) : BOOKS.filter((b) => b === book || prefs.books.includes(b))
    if (next.length === 0) return
    updateSettings({ books: next })
  }

  const status = board.status
  const stale = status ? isStale(status.cycleAt, now) : false

  return (
    <div className="lg:grid lg:h-dvh lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
      <section aria-label="Signalų sąrašas" className="flex min-h-0 flex-col lg:border-r lg:border-rail">
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
                <span className="tnum">{rows.open.length}</span> gyvai
              </p>
            </div>
            <div className="flex items-center gap-1.5">
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
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 font-medium transition-colors ${filtersOpen ? 'bg-chalk text-night' : 'bg-stand text-chalk hairline hover:bg-stand-hover'}`}
              >
                <SlidersHorizontal className="size-4" aria-hidden />
                Filtrai
              </button>
            </div>
          </div>
          <p className="mt-1 text-[0.9rem] text-haze">
            {status ? `Atnaujinta ${agoLabel(status.cycleAt, now)} (${clockLabel(status.cycleAt)})` : 'Laukiam pirmo skenavimo'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Kontoros">
            {BOOKS.map((book) => {
              const on = prefs.books.includes(book)
              return (
                <button
                  key={book}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleBook(book)}
                  className={`inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[0.9rem] font-medium transition-[background-color,color,opacity] ${on ? 'bg-rail text-chalk' : 'text-haze-dim opacity-70 hover:opacity-100'}`}
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
            Pinnacle šiuo metu nepasiekiamas, todėl kainos neatnaujinamos nuo {clockLabel(status.cycleAt)}. Prieš statydamas
            patikrink koeficientą kontoroje.
          </Notice>
        )}
        {status?.sharpAvailable && stale && (
          <Notice>
            Paskutinis skenavimas {clockLabel(status.cycleAt)}, {agoLabel(status.cycleAt, now)} Kainos galėjo pasikeisti.
          </Notice>
        )}
        {loadError && <Notice>{loadError}</Notice>}

        <div className="min-h-0 flex-1 lg:overflow-y-auto">
          {rows.open.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="font-display text-3xl font-bold">
                {status ? 'Šiuo metu signalų nėra' : 'Signalai dar neskelbiami'}
              </p>
              <p className="mx-auto mt-3 max-w-[22rem] text-haze">
                {!status
                  ? 'Kai tik ateis pirmas skenavimas, signalai atsiras čia patys.'
                  : looseCount > 0
                    ? `Pagal tavo filtrus nieko nėra, bet iš viso atviri ${looseCount} ${ltPlural(looseCount, 'signalas', 'signalai', 'signalų')}. Pakeisk filtrus arba kontoras.`
                    : 'Naujas skenavimas vyksta kas pusvalandį. Puslapis atsinaujins pats.'}
              </p>
            </div>
          ) : (
            <ul>
              {rows.open.map((row) => (
                <SignalRow
                  key={row.signal.id}
                  row={row}
                  now={now}
                  active={selectedRow?.signal.id === row.signal.id}
                  onSelect={() => setSelected(row)}
                />
              ))}
            </ul>
          )}

          {rows.closed.length > 0 && (
            <div className="border-t border-rail">
              <button
                type="button"
                aria-expanded={showClosed}
                onClick={() => setShowClosed((value) => !value)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-[0.95rem] text-haze hover:text-chalk sm:px-6"
              >
                Užsidarę per 3 val. ({rows.closed.length})
                <ChevronDown className={`size-4 transition-transform ${showClosed ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {showClosed && (
                <ul className="opacity-70">
                  {rows.closed.map((row) => (
                    <SignalRow
                      key={row.signal.id}
                      row={row}
                      now={now}
                      active={selectedRow?.signal.id === row.signal.id}
                      onSelect={() => setSelected(row)}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Desktop detail */}
      <section aria-label="Signalo informacija" className="hidden min-h-0 overflow-y-auto lg:block">
        {selectedRow ? (
          <SignalDetail key={`${selectedRow.signal.id}-${selectedRow.price.book}`} signal={selectedRow.signal} price={selectedRow.price} now={now} />
        ) : (
          <div className="grid h-full place-items-center px-10 text-center text-haze">
            Pasirink signalą sąraše.
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
              onClose={() => setSelected(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SignalRow({ row, now, active, onSelect }: { row: BoardRow; now: Date; active: boolean; onSelect: () => void }) {
  const { signal, price } = row
  const open = signal.status === 'open'
  return (
    <li className="border-b border-rail last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className={`relative grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-6 ${active ? 'bg-stand' : 'hover:bg-stand/60'}`}
      >
        {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-chalk" />}
        <BookMark book={price.book} />
        <span className="min-w-0">
          <span className="block truncate font-medium">{price.eventName}</span>
          <span className="block truncate text-[0.9rem] text-haze">
            {sportName(signal.sport)}, {open ? timeUntilLabel(signal.startsAt, now) : signal.status === 'started' ? 'prasidėjo' : 'užsidarė'}
          </span>
        </span>
        <span className="text-right">
          <span className="block font-display text-[1.55rem] leading-none font-bold tnum">{formatOdds(price.odds)}</span>
          <span className={`mt-1 block text-[0.9rem] font-semibold ${open ? 'text-floodlight' : 'text-haze-dim line-through'}`}>
            {formatEdge(price.edge)}
          </span>
        </span>
      </button>
    </li>
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
