import { BOOKS } from '@/lib/landing-signals'
import { clockLabel } from '@/lib/live-view'
import type { PublicStats } from '@/lib/public-stats'
import { Reveal, Roll } from './motion-primitives'

const CARD = 'h-full min-w-0 rounded-[20px] bg-stand p-[22px] shadow-[inset_0_0_0_1px_var(--rail)]'

/**
 * The last 24 hours straight from the tables the VM writes: counts and timing only,
 * never the signals. Renders nothing when the numbers are unavailable.
 */
export function LiveStrip({ stats }: { stats: PublicStats | null }) {
  if (!stats) return null
  return (
    <section aria-label="Per paskutinę parą" className="bg-night px-5 py-12 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-[80rem] gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1.35fr_1fr_1fr]">
        <Reveal variant="scale" className={CARD}>
          <Roll value={stats.any} className="block font-display text-[clamp(2rem,3.4vw,2.75rem)] leading-none font-extrabold tracking-[-0.03em]" />
          <p className="mt-2 text-[0.9375rem] text-haze">Signalų per 24 val.</p>
        </Reveal>
        <Reveal variant="scale" delay={60} className={CARD}>
          <div className="flex flex-wrap gap-[18px]">
            {BOOKS.map((book) =>
              stats.perBook[book] === undefined ? null : (
                <span key={book} className="font-display text-[clamp(1.5rem,2.4vw,2rem)] leading-none font-extrabold tracking-[-0.03em]">
                  <Roll value={stats.perBook[book]!} />
                  <span className="block font-sans text-[0.8125rem] font-medium tracking-normal text-haze">{book}</span>
                </span>
              ),
            )}
          </div>
          <p className="mt-3 text-[0.9375rem] text-haze">Pagal kontorą</p>
        </Reveal>
        {stats.medianEdge !== null && (
          <Reveal variant="scale" delay={120} className={CARD}>
            <Roll
              value={stats.medianEdge * 100}
              decimals={1}
              signed
              suffix=" %"
              className="block font-display text-[clamp(2rem,3.4vw,2.75rem)] leading-none font-extrabold tracking-[-0.03em] text-floodlight"
            />
            <p className="mt-2 text-[0.9375rem] text-haze">Vertės mediana</p>
          </Reveal>
        )}
        {stats.lastScanAt && (
          <Reveal variant="scale" delay={180} className={CARD}>
            <p className="font-display text-[clamp(2rem,3.4vw,2.75rem)] leading-none font-extrabold tracking-[-0.03em]">{clockLabel(stats.lastScanAt)}</p>
            <p className="mt-2 text-[0.9375rem] text-haze">Paskutinis skenavimas</p>
          </Reveal>
        )}
      </div>
    </section>
  )
}
