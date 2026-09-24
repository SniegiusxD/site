'use client'

import NumberFlow from '@number-flow/react'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowDown, ArrowUp, Check, Eye, Star, X } from 'lucide-react'
import { BookMark } from '@/components/landing/book-mark'
import { formatEdge, formatEuro, formatOdds } from '@/lib/format-lt'
import { type BoardRow, ltSelection, timeUntilLabel } from '@/lib/live-view'
import { driftOf, DRIFT_FLOOR, type Movement, type Pulse } from '@/lib/price-movement'
import { sportName } from '@/lib/sports-lt'

const EASE = [0.22, 1, 0.36, 1] as const

/** One signal on the board: the row a member scans, plus its pin and hide buttons. */
export function SignalRow({
  row,
  now,
  active,
  stake,
  limit,
  tracked,
  sameMatch,
  isHidden,
  pulse,
  movement,
  pinned,
  onTogglePinned,
  onSelect,
  onToggleHidden,
  enterDelay = 0,
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
  /** Set for a few seconds after a poll: the signal is new, or this book's price moved. */
  pulse?: Pulse
  /** Where this book's price started, once we have seen two cycles. */
  movement?: Movement
  pinned: boolean
  onTogglePinned: () => void
  onSelect: () => void
  onToggleHidden?: () => void
  /** Seconds to wait before this row's entrance (the unlock moment). */
  enterDelay?: number
}) {
  const { signal, price } = row
  const open = signal.status === 'open'
  // Movement is only shown once it is real: two cycles and at least half a point.
  const drift = movement ? driftOf(movement) : null
  const moved = drift !== null && Math.abs(drift) >= DRIFT_FLOOR
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: enterDelay ? 0.45 : 0.3, ease: EASE, delay: enterDelay }}
      className={`relative border-b border-rail last:border-b-0 ${pulse === 'new' ? 'animate-[row-new_2.6s_ease-out]' : ''}`}
    >
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
          <span
            className={`flex items-center justify-end gap-0.5 font-display text-[1.55rem] leading-none font-bold tnum transition-colors duration-700 ${
              pulse === 'up' ? 'text-pitch' : pulse === 'down' ? 'text-brick' : ''
            }`}
          >
            {pulse === 'up' && <ArrowUp className="size-4" aria-hidden />}
            {pulse === 'down' && <ArrowDown className="size-4" aria-hidden />}
            {pulse === 'up' || pulse === 'down' ? (
              <span className="sr-only">{pulse === 'up' ? 'Koeficientas pakilo iki' : 'Koeficientas nukrito iki'}</span>
            ) : null}
            <NumberFlow value={price.odds} locales="lt-LT" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
          </span>
          <span className={`mt-1 block text-[0.9rem] font-semibold ${open ? 'text-floodlight' : 'text-haze-dim line-through'}`}>
            {formatEdge(price.edge)}
          </span>
          {moved && (
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.75rem] font-semibold tnum ${
                drift < 0 ? 'bg-brick-soft text-brick' : 'bg-pitch-soft text-pitch'
              }`}
              title={`Nuo pirmo skenavimo: ${formatOdds(movement!.first)} → ${formatOdds(movement!.last)}`}
            >
              {drift < 0 ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />}
              <span className="sr-only">{drift < 0 ? 'Kaina krito nuo ' : 'Kaina pakilo nuo '}</span>
              {formatOdds(movement!.first)}
            </span>
          )}
        </span>
        <span className="col-span-2 col-start-2 mt-2 flex min-w-0 items-center gap-2 pr-8 text-[0.85rem]">
          {pulse === 'new' && <span className="shrink-0 rounded-full bg-pitch-soft px-1.5 py-0.5 text-[0.75rem] font-semibold text-pitch">Naujas</span>}
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
        {/* How far past the true price this book sits, against a 10 % rail: the
            whole list can be read without looking at a single number. */}
        <span aria-hidden className="col-span-3 mt-2.5 block h-[3px] rounded-full bg-night-deep">
          <span
            className={`block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${open ? 'bg-floodlight' : 'bg-steel'}`}
            style={{ width: `${Math.max(4, Math.min(100, (price.edge / 0.1) * 100))}%` }}
          />
        </span>
      </button>
      <button
        type="button"
        onClick={onTogglePinned}
        aria-pressed={pinned}
        aria-label={pinned ? `Nebesekti: ${price.eventName}` : `Sekti rungtynes: ${price.eventName}`}
        className={`absolute right-2 bottom-11 grid size-8 place-items-center rounded-lg transition-colors sm:right-4 ${
          pinned ? 'text-chalk' : 'text-haze-dim hover:bg-rail hover:text-chalk'
        }`}
      >
        <Star className={`size-4 ${pinned ? 'fill-current' : ''}`} aria-hidden />
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
    </motion.li>
  )
}
