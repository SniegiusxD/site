import { landingExample as example } from '@/lib/landing-example'
import { edgeOf, formatEdge, formatOdds } from '@/lib/format-lt'

// Scale for the bars. Wide enough that the gap reads, narrow enough that a
// 5 % difference is visibly more than a sliver.
const SCALE_MIN = 1.6
const SCALE_MAX = 2.0

function position(odds: number): number {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, odds))
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100
}

export function PriceRail() {
  const fairAt = position(example.fairOdds)
  const rows = [...example.prices].sort((a, b) => b.odds - a.odds)

  return (
    <figure className="rounded-md bg-slate p-5 text-chalk shadow-[0_24px_60px_-28px_rgba(16,24,40,0.55)] sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="font-display text-2xl font-bold tracking-tight">{example.match}</p>
        <p className="text-[0.9rem] text-slate-text">
          {example.competition}, {example.kickoffLabel}
        </p>
      </div>
      <p className="mt-1 text-[0.95rem] text-slate-text">{example.market}</p>

      <div className="mt-6 flex items-baseline justify-between border-b border-slate-line pb-4">
        <p className="text-[0.95rem] text-slate-text">Tikroji kaina (Pinnacle be maržos)</p>
        <p className="font-display text-3xl font-bold tnum">{formatOdds(example.fairOdds)}</p>
      </div>

      <ul className="mt-2">
        {rows.map((row) => {
          const edge = edgeOf(row.odds, example.fairOdds)
          const at = position(row.odds)
          const clears = edge > 0
          return (
            <li
              key={row.book}
              className="grid grid-cols-[5.25rem_1fr_3.25rem] items-center gap-x-3 py-3 sm:grid-cols-[6rem_1fr_3.5rem_4.5rem]"
            >
              <span className="text-[0.95rem] font-medium">{row.book}</span>
              <span aria-hidden className="relative h-3 rounded-[2px] bg-slate-raised">
                <span
                  className="absolute inset-y-0 left-0 rounded-l-[2px] bg-slate-text/30"
                  style={{ width: `${Math.min(at, fairAt)}%` }}
                />
                {clears && (
                  <span
                    className="absolute inset-y-0 bg-floodlight"
                    style={{ left: `${fairAt}%`, width: `${at - fairAt}%` }}
                  />
                )}
                <span
                  className="absolute -inset-y-1.5 w-0.5 bg-chalk"
                  style={{ left: `calc(${fairAt}% - 1px)` }}
                />
              </span>
              <span className="text-right font-display text-2xl font-bold tnum">
                {formatOdds(row.odds)}
              </span>
              <span
                className={`col-start-2 text-[0.9rem] tnum sm:col-start-auto sm:text-right sm:text-base ${
                  clears ? 'font-semibold text-floodlight' : 'text-slate-text/80'
                }`}
              >
                {formatEdge(edge)}
              </span>
            </li>
          )
        })}
      </ul>

      <figcaption className="mt-4 border-t border-slate-line pt-4 text-[0.85rem] leading-snug text-slate-text">
        Tikras pavyzdys iš mūsų skenavimo, {example.capturedLabel}. Tą pačią akimirką tik
        viena kontora mokėjo daugiau už tikrąją kainą.
      </figcaption>
    </figure>
  )
}
