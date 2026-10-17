'use client'

import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { BookMark } from '@/components/landing/book-mark'
import { formatEdge, formatOdds } from '@/lib/format-lt'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import { compactUntilLabel, ltSelection, type BoardRow } from '@/lib/live-view'
import { EASE } from '@/lib/motion'
import { DRIFT_FLOOR, driftOf, type Movement } from '@/lib/price-movement'
import { sportName } from '@/lib/sports-lt'

/** Shared by the rows and their header, so the columns line up. */
export const GRID_COLUMNS = 'lg:grid-cols-[5.5rem_minmax(0,1fr)_4rem_repeat(3,5.75rem)]'

/** Column names above the comparison grid, desktop only. Each cell names itself for screen readers. */
export function MarketGridHeader() {
  return (
    <div aria-hidden className={`hidden items-center gap-x-2 border-b border-rail py-1.5 pr-4 pl-6 text-[0.75rem] text-haze-dim lg:grid ${GRID_COLUMNS}`}>
      <span>Pradžia</span>
      <span>Rungtynės ir statymas</span>
      <span className="text-right">Tikroji</span>
      {BOOKS.map((book) => (
        <span key={book} className="flex items-center justify-end gap-1.5">
          <BookMark book={book} size="sm" />
          {book}
        </span>
      ))}
    </div>
  )
}

/**
 * One selection with every book's price side by side against the fair price: the
 * whole market for this bet at a glance, the best playable price marked. A book
 * without a price for this exact selection shows a dash, never a guess.
 */
export function MarketGridRow({
  row,
  now,
  active,
  movement,
  onSelect,
}: {
  row: BoardRow
  now: Date
  active: boolean
  movement?: Partial<Record<BookName, Movement>>
  onSelect: () => void
}) {
  const { signal, price: best } = row
  const open = signal.status === 'open'
  const byBook = new Map(signal.prices.map((price) => [price.book, price]))
  const when = open ? compactUntilLabel(signal.startsAt, now) : signal.status === 'started' ? 'prasidėjo' : 'užsidarė'

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      className={`border-b border-rail last:border-b-0 ${active ? 'bg-stand' : 'hover:bg-stand/60'}`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? 'true' : undefined}
        className={`grid w-full gap-x-2 gap-y-2 px-4 py-3 text-left sm:px-6 lg:items-center lg:py-2 ${GRID_COLUMNS}`}
      >
        <span className="text-[0.85rem] text-haze tnum lg:col-auto">
          <span className="text-chalk">{when}</span>
          <span className="block truncate">{sportName(signal.sport)}</span>
        </span>
        <span className="min-w-0">
          <span className="block truncate font-medium">{best.eventName}</span>
          <span className="block truncate text-[0.85rem] text-haze">{ltSelection(best.selectionLabel)}</span>
        </span>
        <span className="text-right text-haze tnum max-lg:hidden">
          <span className="sr-only">Tikroji kaina </span>
          {formatOdds(signal.fairOdds)}
        </span>
        {/* Phones: the fair price and the three books as one strip under the title. */}
        <span className="col-span-full grid grid-cols-4 gap-1.5 lg:contents">
          <span className="rounded-lg bg-night/60 px-2 py-1.5 text-center lg:hidden">
            <span className="block text-[0.7rem] text-haze-dim">Tikroji</span>
            <span className="font-semibold tnum">{formatOdds(signal.fairOdds)}</span>
          </span>
          {BOOKS.map((book) => {
            const price = byBook.get(book)
            const isBest = price?.book === best.book
            const move = movement?.[book]
            const drift = move && move.seen > 1 ? driftOf(move) : 0
            return (
              <span
                key={book}
                className={`relative rounded-lg px-2 py-1.5 text-center lg:text-right ${
                  isBest && open ? 'bg-floodlight-soft ring-1 ring-floodlight/60' : 'bg-night/60 lg:bg-transparent'
                }`}
              >
                <span className="flex items-center justify-center gap-1 text-[0.7rem] text-haze-dim lg:hidden">
                  <BookMark book={book} size="sm" />
                </span>
                {price ? (
                  <>
                    <span className={`flex items-center justify-center gap-0.5 font-display text-[1.05rem] font-bold tnum lg:justify-end ${isBest && open ? 'text-floodlight' : ''}`}>
                      <span className="sr-only">{book} koeficientas </span>
                      {Math.abs(drift) >= DRIFT_FLOOR &&
                        (drift > 0 ? (
                          <ArrowUpRight className="size-3.5 text-pitch" aria-label="kaina kilo" />
                        ) : (
                          <ArrowDownRight className="size-3.5 text-haze" aria-label="kaina krito" />
                        ))}
                      {formatOdds(price.odds)}
                    </span>
                    <span className={`block text-[0.75rem] tnum ${price.published && price.edge > 0 ? 'text-floodlight' : 'text-haze-dim'}`}>
                      <span className="sr-only">vertė </span>
                      {formatEdge(price.edge)}
                    </span>
                  </>
                ) : (
                  <span className="block py-1 text-haze-dim">
                    <span className="sr-only">{book}: kainos nėra</span>
                    <span aria-hidden>–</span>
                  </span>
                )}
              </span>
            )
          })}
        </span>
      </button>
    </motion.li>
  )
}
