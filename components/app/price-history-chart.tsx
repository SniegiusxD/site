'use client'

import { formatEdge, formatOdds } from '@/lib/format-lt'
import { clockLabel } from '@/lib/live-view'
import { useApi } from '@/lib/use-api'
import type { BookName } from '@/lib/landing-signals'
import { BookMark } from '@/components/landing/book-mark'
import { LoadError } from './load-error'

type Point = { book: BookName; odds: number; fair?: number; at: string }

const W = 600
const H = 180

/**
 * What this price has done since we first saw it, against the fair price at
 * each scan. Drawn only from captures we actually stored: a signal in its first
 * cycle says so instead of drawing a flat line that looks like stability.
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
  // Older API responses carry no per-scan fair price: fall back to today's.
  const fairs = mine.map((point) => point.fair ?? fairOdds)
  const min = Math.min(...odds, ...fairs)
  const max = Math.max(...odds, ...fairs)
  // Padding keeps both lines off the frame; a floor keeps a flat price mid-chart.
  const pad = Math.max((max - min) * 0.25, 0.03)
  const low = min - pad
  const high = max + pad
  const x = (index: number) => (index / (mine.length - 1)) * W
  const y = (value: number) => H - ((value - low) / (high - low)) * H
  const line = (values: number[]) => values.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
  const area = `${line(odds)} ${fairs
    .map((value, index) => `L${x(index).toFixed(1)},${y(value).toFixed(1)}`)
    .reverse()
    .join(' ')} Z`

  const first = mine[0]
  const last = mine[mine.length - 1]
  const change = last.odds / first.odds - 1
  const lineColor = change < 0 ? 'var(--brick)' : 'var(--floodlight)'
  const hours = Math.max(0, Math.round((Date.parse(last.at) - Date.parse(first.at)) / 3_600_000))
  const ticks = [first, mine[Math.floor((mine.length - 1) / 2)], last]

  return (
    <section aria-label="Kainos istorija" className="mt-4 rounded-2xl bg-stand p-5 hairline sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[1.05rem] font-semibold">
          <BookMark book={book} size="sm" />
          Kainos istorija
        </h3>
        <p className="text-[0.85rem] text-haze tnum">
          {mine.length} skenavimai{hours > 0 ? ` · ${hours} val.` : ''}
        </p>
      </div>

      <div aria-hidden className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.8rem] text-haze">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: lineColor }} />
          {book}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-chalk/60" />
          Tikroji kaina
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-3 rounded-sm bg-floodlight-soft" />
          Vertė
        </span>
      </div>

      <div className="relative mt-2 rounded-xl bg-night-deep px-3 pt-3 pb-2">
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-[180px] w-full"
            role="img"
            aria-label={`${book}: nuo ${formatOdds(first.odds)} iki ${formatOdds(last.odds)}, tikroji kaina ${formatOdds(fairs[fairs.length - 1])}`}
          >
            {[0.25, 0.5, 0.75].map((at) => (
              <line key={at} x1={0} x2={W} y1={H * at} y2={H * at} stroke="var(--rail)" strokeOpacity={0.6} vectorEffect="non-scaling-stroke" />
            ))}
            <path d={area} fill="var(--floodlight-soft)" />
            <path d={line(fairs)} fill="none" stroke="var(--chalk)" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
            <path d={line(odds)} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* The end dot is HTML: an SVG circle would stretch with the chart. */}
          <span
            aria-hidden
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-night-deep"
            style={{ left: '100%', top: `${(y(last.odds) / H) * 100}%`, background: lineColor }}
          />
          <span aria-hidden className="absolute top-0 left-0 rounded bg-night-deep/80 px-1 text-[0.7rem] text-haze-dim tnum">{formatOdds(high)}</span>
          <span aria-hidden className="absolute bottom-0 left-0 rounded bg-night-deep/80 px-1 text-[0.7rem] text-haze-dim tnum">{formatOdds(low)}</span>
        </div>
        <div aria-hidden className="mt-1.5 flex justify-between text-[0.75rem] text-haze-dim tnum">
          {ticks.map((point, index) => (
            <span key={index}>{clockLabel(point.at)}</span>
          ))}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl px-3 py-2 hairline">
          <dt className="text-[0.75rem] text-haze">Pirmą kartą</dt>
          <dd className="font-display text-[1.15rem] font-bold tnum">{formatOdds(first.odds)}</dd>
        </div>
        <div className="rounded-xl px-3 py-2 hairline">
          <dt className="text-[0.75rem] text-haze">Dabar</dt>
          <dd className="font-display text-[1.15rem] font-bold tnum">
            {formatOdds(last.odds)}{' '}
            <span className={`text-[0.8rem] font-semibold ${change < 0 ? 'text-brick' : change > 0 ? 'text-floodlight' : 'text-haze'}`}>{Math.abs(change) < 0.0005 ? 'be pokyčio' : formatEdge(change)}</span>
          </dd>
        </div>
        <div className="rounded-xl px-3 py-2 hairline">
          <dt className="text-[0.75rem] text-haze">Tikroji</dt>
          <dd className="font-display text-[1.15rem] font-bold tnum">{formatOdds(fairs[fairs.length - 1])}</dd>
        </div>
      </dl>
    </section>
  )
}
