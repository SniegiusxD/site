'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Segmented } from '@/components/app/segmented'
import { formatEdge, formatOdds } from '@/lib/format-lt'

export type ResultRow = {
  id: string
  when: string
  sport: string
  event: string
  pick: string
  book: string
  odds: number
  clv: number | null
  outcome: string | null
  /** 1 won, -1 lost, 0 push/void, null not graded yet. */
  tone: 1 | -1 | 0 | null
}

const PAGE = 40

/** Every started signal, newest first; filter by book, then page through. */
export function ResultsList({ rows, books }: { rows: ResultRow[]; books: string[] }) {
  const [book, setBook] = useState('all')
  const [shown, setShown] = useState(PAGE)
  const filtered = book === 'all' ? rows : rows.filter((row) => row.book === book)
  const visible = filtered.slice(0, shown)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Kontora"
          options={[{ value: 'all', label: 'Visos' }, ...books.map((name) => ({ value: name, label: name }))]}
          value={book}
          onChange={(value) => {
            setBook(value)
            setShown(PAGE)
          }}
        />
        <p className="text-[0.9rem] text-haze">{filtered.length} signalų</p>
      </div>

      <div className="mt-5 hidden grid-cols-[7.5rem_1fr_5.5rem_4.5rem_5.5rem_7rem] gap-4 px-4 text-[0.8rem] text-haze-dim md:grid">
        <span>Pradžia</span>
        <span>Signalas</span>
        <span>Kontora</span>
        <span className="text-right">Koef.</span>
        <span className="text-right">CLV</span>
        <span className="text-right">Rezultatas</span>
      </div>
      <ul className="mt-2 divide-y divide-rail rounded-2xl bg-stand hairline">
        {visible.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[7.5rem_1fr_5.5rem_4.5rem_5.5rem_7rem] md:items-center"
          >
            <span className="order-3 text-[0.85rem] text-haze md:order-none">{row.when}</span>
            <span className="order-1 min-w-0 md:order-none">
              <Link
                href={`/rezultatai/${row.id}`}
                className="block truncate text-chalk underline decoration-transparent underline-offset-4 transition-colors hover:decoration-rail-strong"
              >
                {row.pick}
              </Link>
              <span className="block truncate text-[0.85rem] text-haze">
                {row.sport} · {row.event}
              </span>
            </span>
            <span className="order-4 text-right text-[0.85rem] text-haze md:order-none md:text-left md:text-[0.95rem]">
              {row.book} <span className="md:hidden">· {formatOdds(row.odds)}</span>
            </span>
            <span className="hidden text-right tabular-nums text-chalk md:block">{formatOdds(row.odds)}</span>
            <span
              className={`order-2 text-right tabular-nums md:order-none ${
                row.clv === null ? 'text-haze-dim' : row.clv > 0 ? 'text-pitch' : 'text-haze'
              }`}
            >
              {row.clv === null ? 'nėra' : formatEdge(row.clv)}
              <span className="sr-only"> CLV</span>
            </span>
            <span
              className={`order-5 col-span-2 text-[0.85rem] md:order-none md:col-span-1 md:text-right md:text-[0.95rem] ${
                row.tone === 1 ? 'text-pitch' : row.tone === -1 ? 'text-brick' : 'text-haze-dim'
              }`}
            >
              {row.outcome ?? 'Laukiama'}
            </span>
          </li>
        ))}
        {visible.length === 0 && <li className="px-4 py-8 text-center text-haze">Šios kontoros signalų per šį laikotarpį nebuvo.</li>}
      </ul>
      {shown < filtered.length && (
        <button
          type="button"
          onClick={() => setShown((count) => count + PAGE)}
          className="mt-4 min-h-11 w-full rounded-xl bg-stand font-medium text-chalk hairline transition-colors hover:bg-stand-hover"
        >
          Rodyti dar {Math.min(PAGE, filtered.length - shown)}
        </button>
      )}
    </div>
  )
}
