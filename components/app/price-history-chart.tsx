'use client'

import { formatEdge, formatOdds } from '@/lib/format-lt'
import { useApi } from '@/lib/use-api'
import type { BookName } from '@/lib/landing-signals'
import { BookMark } from '@/components/landing/book-mark'
import { LoadError } from './load-error'

type Point = { book: BookName; odds: number; at: string }

/**
 * What this price has done since we first saw it. Drawn only from captures we
 * actually stored: a signal in its first cycle says so instead of drawing a
 * flat line that looks like stability.
 */
export function PriceHistoryChart({ signalId, book, fairOdds }: { signalId: string; book: BookName; fairOdds: number }) {
  // Switching signals shows nothing rather than the previous signal's history
  // while the new one loads. A failure says so: "no history yet" would be wrong.
  const { data, error, loading, reload } = useApi<{ points?: Point[] }>(`/api/signals/${encodeURIComponent(signalId)}/history`)
  if (loading || (!data && !error)) return null
  if (error) return <LoadError error={error} what="kainos istorijos" onRetry={reload} className="mt-4" />

  const mine = (data?.points ?? []).filter((point) => point.book === book)
  if (mine.length < 2) {
    return (
      <p className="mt-4 text-[0.9rem] text-haze">
        Kainos istorijos dar nėra: šį signalą matėm tik viename skenavime. Pasirodys po kito.
      </p>
    )
  }

  const odds = mine.map((point) => point.odds)
  const low = Math.min(fairOdds, ...odds)
  const high = Math.max(fairOdds, ...odds)
  const span = high - low || 1
  const width = 320
  const height = 72
  const x = (index: number) => (index / (mine.length - 1)) * width
  const y = (value: number) => height - ((value - low) / span) * height
  const path = mine.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.odds).toFixed(1)}`).join(' ')
  const first = mine[0]
  const last = mine[mine.length - 1]
  const change = last.odds / first.odds - 1
  const hours = Math.max(0, Math.round((Date.parse(last.at) - Date.parse(first.at)) / 3_600_000))

  return (
    <section aria-label="Kainos istorija" className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[1.05rem] font-semibold">
          <BookMark book={book} size="sm" />
          Kainos istorija
        </h3>
        <p className="text-[0.85rem] text-haze">
          {mine.length} skenavimai{hours > 0 ? `, ${hours} val.` : ''}
        </p>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 block h-[72px] w-full" role="img" aria-label={`Nuo ${formatOdds(first.odds)} iki ${formatOdds(last.odds)}`}>
        <line x1={0} x2={width} y1={y(fairOdds)} y2={y(fairOdds)} stroke="var(--chalk)" strokeOpacity={0.5} strokeDasharray="4 4" strokeWidth={1} />
        <path d={path} fill="none" stroke={change < 0 ? 'var(--brick)' : 'var(--floodlight)'} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(mine.length - 1)} cy={y(last.odds)} r={3.5} fill={change < 0 ? 'var(--brick)' : 'var(--floodlight)'} />
      </svg>

      <p className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[0.875rem] text-haze">
        <span>
          Pirmą kartą <span className="font-semibold text-chalk tnum">{formatOdds(first.odds)}</span> · dabar{' '}
          <span className="font-semibold text-chalk tnum">{formatOdds(last.odds)}</span>
        </span>
        <span className={change < 0 ? 'text-brick' : 'text-floodlight'}>
          {formatEdge(change)} nuo pirmo skenavimo
        </span>
      </p>
      <p className="mt-1 text-[0.8125rem] text-haze-dim">Brūkšninė linija — tikroji kaina {formatOdds(fairOdds)}.</p>
    </section>
  )
}
