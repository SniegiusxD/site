'use client'

import { useMemo } from 'react'
import { equityCurve } from '@/lib/equity'
import { formatEuro, formatPercent, ltPlural } from '@/lib/format-lt'
import type { ActiveBet } from '@/lib/types'
import { signedEuro } from './value-chart'

const tone = (value: number) => (value > 0.004 ? 'text-pitch' : value < -0.004 ? 'text-brick' : 'text-chalk')

const HEIGHT = 150
const PAD = { top: 10, bottom: 18 }

/**
 * The bankroll line, with the deepest fall below its own peak shaded. Members
 * quit inside drawdowns, not at final totals, so the low is named in euro,
 * in share of the peak, and in how long it took to climb back.
 */
export function EquityChart({ bets }: { bets: ActiveBet[] }) {
  const curve = useMemo(() => equityCurve(bets), [bets])
  if (curve.points.length < 3) return null

  const values = curve.points.map((point) => point.equity)
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const span = high - low || 1
  const width = 640
  const x = (index: number) => ((index - 1) / Math.max(1, curve.points.length - 1)) * width
  const y = (value: number) => PAD.top + (1 - (value - low) / span) * (HEIGHT - PAD.top - PAD.bottom)
  const line = curve.points.map((point, index) => `${index ? 'L' : 'M'}${x(point.index).toFixed(1)},${y(point.equity).toFixed(1)}`).join(' ')
  const area = `${line} L${width},${y(low)} L0,${y(low)} Z`

  return (
    <section aria-labelledby="equity-title" className="mt-10 rounded-2xl bg-stand p-5 hairline sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="equity-title" className="text-[1.6rem]">
            Bankrollo kelias
          </h2>
          <p className="mt-1 text-[0.9rem] text-haze">
            {curve.points.length} užbaigti statymai iš eilės. Pilka juosta — kiek buvai žemiau savo geriausio taško.
          </p>
        </div>
        <p className={`font-display text-[2rem] leading-none font-bold tnum ${tone(curve.final)}`}>{signedEuro(curve.final)}</p>
      </div>

      <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="mt-4 block h-[150px] w-full" role="img" aria-label={`Bankrollo kelias: dabar ${signedEuro(curve.final)}, giliausias kritimas ${signedEuro(curve.maxDrawdown)}`}>
        <line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke="var(--rail-strong)" strokeWidth={1} />
        <path d={area} fill="var(--floodlight)" fillOpacity={0.08} />
        <path d={line} fill="none" stroke="var(--chalk)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(curve.points[curve.points.length - 1].index)} cy={y(curve.final)} r={3.5} fill="var(--chalk)" />
      </svg>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-rail pt-4 text-[0.9rem] sm:grid-cols-4">
        <div>
          <dt className="text-haze">Giliausias kritimas</dt>
          <dd className="mt-0.5 font-semibold text-brick tnum">
            {signedEuro(curve.maxDrawdown)}
            {curve.maxDrawdownShare !== null && (
              <span className="ml-1.5 font-normal text-haze">{formatPercent(Math.abs(curve.maxDrawdownShare), 0)} nuo piko</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-haze">Geriausias taškas</dt>
          <dd className="mt-0.5 font-semibold tnum">{formatEuro(curve.peak, 2)}</dd>
        </div>
        <div>
          <dt className="text-haze">Kol atsigavai</dt>
          <dd className="mt-0.5 font-semibold tnum">
            {curve.recoveryBets === null
              ? 'dar nepasiektas'
              : `${curve.recoveryBets} ${ltPlural(curve.recoveryBets, 'statymas', 'statymai', 'statymų')}`}
          </dd>
        </div>
        <div>
          <dt className="text-haze">Ilgiausia pralaimėjimų serija</dt>
          <dd className="mt-0.5 font-semibold tnum">
            {curve.longestLosingRun} {ltPlural(curve.longestLosingRun, 'statymas', 'statymai', 'statymų')}
          </dd>
        </div>
      </dl>
    </section>
  )
}
