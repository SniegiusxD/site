'use client'

import NumberFlow from '@number-flow/react'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Check, Eye, Star, X } from 'lucide-react'
import { BookMark } from '@/components/landing/book-mark'
import { CopyButton } from '@/components/landing/copy-button'
import { formatEdge, formatEuro, formatOdds } from '@/lib/format-lt'
import { agoLabel, type BoardRow, compactUntilLabel, ltSelection, timeUntilLabel } from '@/lib/live-view'
import { driftOf, DRIFT_FLOOR, type Movement, type Pulse } from '@/lib/price-movement'
import { sportName } from '@/lib/sports-lt'
import { EASE, SPRING } from '@/lib/motion'
import { soonMinutes, StartingSoon } from './board/starting-soon'


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
  const [pops, setPops] = useState(0)
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
            <span data-flip={`odds-${signal.id}-${price.book}`}>
              <NumberFlow value={price.odds} locales="lt-LT" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
            </span>
          </span>
          <span className={`mt-1 block text-[0.9rem] font-semibold ${open ? 'text-floodlight' : 'text-haze-dim line-through'}`}>
            <span data-flip={`edge-${signal.id}-${price.book}`}>{formatEdge(price.edge)}</span>
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
            {sportName(signal.sport)},{' '}
            {open ? (
              <span className={soonMinutes(signal.startsAt, now) !== null ? 'text-warning' : undefined}>
                <StartingSoon startsAt={signal.startsAt} now={now} />
                {timeUntilLabel(signal.startsAt, now)}
              </span>
            ) : signal.status === 'started' ? (
              'prasidėjo'
            ) : (
              'užsidarė'
            )}
            {/* How long the price has stood: an old signal is more likely gone at the book. */}
            {open && <> · rastas {agoLabel(signal.firstSeenAt, now)}</>}
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
        onClick={() => {
          if (!pinned) setPops((value) => value + 1)
          onTogglePinned()
        }}
        aria-pressed={pinned}
        aria-label={pinned ? `Nebesekti: ${price.eventName}` : `Sekti rungtynes: ${price.eventName}`}
        className={`absolute right-2 bottom-11 grid size-8 place-items-center rounded-lg transition-colors sm:right-4 ${
          pinned ? 'text-chalk' : 'text-haze-dim hover:bg-rail hover:text-chalk'
        }`}
      >
        <PinStar pinned={pinned} pops={pops} />
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

/**
 * The same signal in one line, for the compact board: sport, match, bet, book,
 * odds, fair odds, value, suggested stake and time to start. Phones get two
 * lines. On desktop, copy, pin and hide sit at the end of the line.
 */
export function CompactSignalRow({
  row,
  now,
  active,
  stake,
  tracked,
  sameMatch,
  isHidden,
  pulse,
  pinned,
  onTogglePinned,
  onSelect,
  onToggleHidden,
  onCopied,
}: {
  row: BoardRow
  now: Date
  active: boolean
  stake: number
  tracked: number
  sameMatch: number
  isHidden?: boolean
  pulse?: Pulse
  pinned: boolean
  onTogglePinned: () => void
  onSelect: () => void
  onToggleHidden?: () => void
  /** The event name went to the clipboard. */
  onCopied?: () => void
}) {
  const [pops, setPops] = useState(0)
  const { signal, price } = row
  const open = signal.status === 'open'
  const when = open ? compactUntilLabel(signal.startsAt, now) : signal.status === 'started' ? 'prasidėjo' : 'užsidarė'
  const oddsTone = pulse === 'up' ? 'text-pitch' : pulse === 'down' ? 'text-brick' : ''
  const edgeTone = open ? 'text-floodlight' : 'text-haze-dim line-through'
  const amount =
    tracked > 0 ? (
      <span className="inline-flex items-center gap-0.5 font-semibold text-pitch">
        <Check className="size-3.5" aria-hidden />
        <span className="sr-only">Pažymėta </span>
        {formatEuro(tracked)}
      </span>
    ) : open && stake > 0 ? (
      <span>
        <span className="sr-only">Siūloma suma </span>
        {formatEuro(stake)}
      </span>
    ) : (
      <span className="text-haze-dim">–</span>
    )

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={`relative flex items-stretch border-b border-rail last:border-b-0 ${pulse === 'new' ? 'animate-[row-new_2.6s_ease-out]' : ''} ${
        active ? 'bg-stand' : 'hover:bg-stand/60'
      }`}
    >
      {active && <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-r bg-chalk" />}
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className="min-w-0 flex-1 px-4 py-2 text-left text-[0.9rem] sm:px-6 lg:py-1.5 lg:pr-2"
      >
        {/* Phones: two lines. */}
        <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 lg:hidden">
          <BookMark book={price.book} size="sm" />
          <span className="truncate font-medium">{price.eventName}</span>
          <span data-flip={`odds-${signal.id}-${price.book}`} className={`font-display text-[1.05rem] font-bold tnum ${oddsTone}`}>{formatOdds(price.odds)}</span>
          <span className="col-span-2 col-start-1 truncate text-[0.85rem] text-haze">
            {pulse === 'new' && <span className="mr-1.5 font-semibold text-pitch">Naujas</span>}
            {ltSelection(price.selectionLabel)} · {when}
          </span>
          <span className="flex items-center justify-end gap-2 text-[0.85rem] tnum">
            <span data-flip={`edge-${signal.id}-${price.book}`} className={`font-semibold ${edgeTone}`}>{formatEdge(price.edge)}</span>
            {amount}
          </span>
        </span>
        {/* Desktop: one line, the columns of the header above the list. */}
        <span className={`hidden items-center gap-x-2 lg:grid ${COMPACT_COLUMNS}`}>
          <BookMark book={price.book} size="sm" />
          <span className="truncate text-haze">{sportName(signal.sport)}</span>
          <span className="flex min-w-0 items-center gap-1.5">
            {pulse === 'new' && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-pitch" />}
            {pulse === 'new' && <span className="sr-only">Naujas. </span>}
            {sameMatch > 0 && tracked === 0 && (
              <span className="shrink-0 text-warning" title="Jau statei šiose rungtynėse">
                <AlertTriangle className="size-3.5" aria-hidden />
                <span className="sr-only">Jau statei šiose rungtynėse. </span>
              </span>
            )}
            <span className="truncate font-medium" title={price.eventName}>
              {price.eventName}
            </span>
          </span>
          <span className="truncate text-chalk/85" title={ltSelection(price.selectionLabel)}>
            {ltSelection(price.selectionLabel)}
          </span>
          <span className={`text-right font-display text-[1.05rem] font-bold tnum transition-colors duration-700 ${oddsTone}`}>
            <span className="sr-only">Koeficientas </span>
            {formatOdds(price.odds)}
          </span>
          <span className="text-right text-haze tnum">
            <span className="sr-only">Tikroji kaina </span>
            {formatOdds(signal.fairOdds)}
          </span>
          <span className={`text-right font-semibold tnum ${edgeTone}`}>
            <span className="sr-only">Vertė </span>
            {formatEdge(price.edge)}
          </span>
          <span className="text-right tnum">{amount}</span>
          <span className={`truncate text-right tnum ${open && soonMinutes(signal.startsAt, now) !== null ? 'text-warning' : 'text-haze'}`}>
            {open && <StartingSoon startsAt={signal.startsAt} now={now} />}
            {when}
          </span>
        </span>
      </button>
      <span className="hidden shrink-0 items-center pr-3 lg:flex">
        <CopyButton
          text={price.eventName}
          label={price.eventName}
          icon="plain"
          className="size-8 justify-center p-0!"
          onCopied={onCopied}
        />
        <button
          type="button"
          onClick={() => {
          if (!pinned) setPops((value) => value + 1)
          onTogglePinned()
        }}
          aria-pressed={pinned}
          aria-label={pinned ? `Nebesekti: ${price.eventName}` : `Sekti rungtynes: ${price.eventName}`}
          className={`grid size-8 place-items-center rounded-lg transition-colors ${pinned ? 'text-chalk' : 'text-haze-dim hover:bg-rail hover:text-chalk'}`}
        >
          <PinStar pinned={pinned} pops={pops} />
        </button>
        {onToggleHidden ? (
          <button
            type="button"
            onClick={onToggleHidden}
            aria-label={isHidden ? `Grąžinti į sąrašą: ${price.eventName}` : `Paslėpti: ${price.eventName}`}
            className="grid size-8 place-items-center rounded-lg text-haze-dim transition-colors hover:bg-rail hover:text-chalk"
          >
            {isHidden ? <Eye className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
          </button>
        ) : (
          <span aria-hidden className="size-8" />
        )}
      </span>
    </motion.li>
  )
}

/** Shared by the compact rows and their column header, so the two line up. */
export const COMPACT_COLUMNS =
  'grid-cols-[1.5rem_4.5rem_minmax(0,1.4fr)_minmax(0,1fr)_3.25rem_3.25rem_3.5rem_3.5rem_5.75rem]'

/** The column names above the compact list, desktop only. Rows name each figure for screen readers. */
export function CompactHeader() {
  return (
    <div
      aria-hidden
      className={`hidden items-center gap-x-2 border-b border-rail py-1.5 pr-[7.25rem] pl-6 text-[0.75rem] text-haze-dim lg:grid ${COMPACT_COLUMNS}`}
    >
      <span />
      <span>Sportas</span>
      <span>Rungtynės</span>
      <span>Statymas</span>
      <span className="text-right">Koef.</span>
      <span className="text-right">Tikroji</span>
      <span className="text-right">Vertė</span>
      <span className="text-right">Suma</span>
      <span className="text-right">Pradžia</span>
    </div>
  )
}

/** The star pops as it fills, only right after the member pins (never on load). */
function PinStar({ pinned, pops }: { pinned: boolean; pops: number }) {
  return (
    <motion.span
      key={pops}
      className="inline-flex"
      initial={pops ? { scale: 0.4, rotate: -40 } : false}
      animate={{ scale: 1, rotate: 0 }}
      transition={SPRING.snappy}
    >
      <Star className={`size-4 ${pinned ? 'fill-current' : ''}`} aria-hidden />
    </motion.span>
  )
}
