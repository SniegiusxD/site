import { formatEdge, formatInteger } from '@/lib/format-lt'
import type { ClvDay } from '@/lib/public-results'

/** A day with fewer closes than this is drawn faintly: one or two signals say little. */
const THIN_DAY = 5
const HEIGHT = 160
const MIDDLE = HEIGHT / 2

const shortDate = (day: string) => `${Number(day.slice(5, 7))}-${day.slice(8, 10)}`

/**
 * Mean CLV per kickoff day as bars around zero. Static SVG from the server: no
 * motion, no client code, and its size is fixed before any data arrives.
 */
export function ClvDays({ days }: { days: ClvDay[] }) {
  if (days.length < 2) return null
  const peak = Math.max(0.05, ...days.map((day) => Math.abs(day.meanClv)))
  const positive = days.filter((day) => day.meanClv > 0).length
  const width = 100 / days.length

  return (
    <figure>
      <svg
        viewBox={`0 0 100 ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`Vidutinis CLV kiekvieną dieną: ${positive} iš ${days.length} dienų teigiamas.`}
      >
        {days.map((day, index) => {
          const size = (Math.abs(day.meanClv) / peak) * (MIDDLE - 4)
          const up = day.meanClv >= 0
          return (
            <rect
              key={day.day}
              x={index * width + width * 0.15}
              width={width * 0.7}
              y={up ? MIDDLE - size : MIDDLE}
              height={Math.max(size, 0.5)}
              rx={0.6}
              // Each bar grows out of the zero line, left to right: the one
              // moment of motion in this chart.
              className={`kr-bar-grow ${up ? 'fill-pitch' : 'fill-brick'}`}
              style={{ transformOrigin: up ? 'bottom' : 'top', animationDelay: `${120 + index * 60}ms` }}
              opacity={day.withClose < THIN_DAY ? 0.35 : 1}
            >
              <title>
                {`${day.day}: ${formatEdge(day.meanClv)} vid. CLV, ${formatInteger(day.withClose)} su uždarymu`}
              </title>
            </rect>
          )
        })}
        <line x1={0} x2={100} y1={MIDDLE} y2={MIDDLE} className="stroke-rail-strong" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      <div aria-hidden className="mt-1.5 flex justify-between text-[0.8rem] whitespace-nowrap text-haze-dim tabular-nums">
        <span>{shortDate(days[0].day)}</span>
        <span>{shortDate(days[days.length - 1].day)}</span>
      </div>
      <figcaption className="mt-2 text-[0.9rem] text-haze">
        {positive} iš {days.length} dienų vidutinis CLV teigiamas. Blankūs stulpeliai — dienos, kai buvo mažiau nei {THIN_DAY}{' '}
        signalai su uždarymo kaina.
      </figcaption>
    </figure>
  )
}
