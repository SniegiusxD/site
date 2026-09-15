'use client'

import { formatPercent } from '@/lib/format-lt'
import type { Simulation } from '@/lib/simulate'
import { ScenarioChart, signedWhole } from './scenario-chart'

/** The headline of a set of scenarios: the typical result, how often it ends below zero, and the tails. */
export function Outlook({
  simulation,
  title,
  detail,
  betsLabel,
}: {
  simulation: Simulation
  title: string
  detail: React.ReactNode
  betsLabel?: string
}) {
  return (
    <section aria-label={title} className="rounded-2xl bg-stand p-5 hairline sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.9rem] text-haze">{title}</p>
          <p className={`mt-1 font-display text-[3rem] leading-none font-bold ${simulation.median >= 0 ? 'text-pitch' : 'text-brick'}`}>
            {signedWhole(simulation.median)}
          </p>
          <p className="mt-2 text-[0.85rem] text-haze">{detail}</p>
        </div>
        <p className="text-right">
          <span className="block font-display text-[2.2rem] leading-none font-bold">{formatPercent(simulation.shareNegative, 0)}</span>
          <span className="mt-1 block text-[0.85rem] text-haze">scenarijų baigiasi minuse</span>
        </p>
      </div>
      <div className="mt-5">
        <ScenarioChart simulation={simulation} betsLabel={betsLabel} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-rail pt-4 text-[0.95rem]">
        <div>
          <dt className="text-haze">Blogiausi 5 %</dt>
          <dd className="mt-0.5 font-semibold">iki {signedWhole(simulation.p5)}</dd>
        </div>
        <div>
          <dt className="text-haze">Geriausi 5 %</dt>
          <dd className="mt-0.5 font-semibold">nuo {signedWhole(simulation.p95)}</dd>
        </div>
      </dl>
    </section>
  )
}
