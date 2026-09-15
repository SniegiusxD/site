import Link from 'next/link'
import { formatEdge, formatInteger, ltPlural } from '@/lib/format-lt'
import { BOOKS } from '@/lib/landing-signals'
import { clockLabel } from '@/lib/live-view'
import type { PublicStats } from '@/lib/public-stats'

/**
 * Yesterday-to-now in one line, straight from the tables the VM writes. Shows
 * counts and timing only; the signals stay for members. Renders nothing when
 * the numbers are unavailable.
 */
export function LiveStrip({ stats }: { stats: PublicStats | null }) {
  if (!stats) return null
  return (
    <section aria-label="Per paskutinę parą" className="border-t border-rail bg-night-deep">
      <div className="mx-auto flex max-w-[80rem] flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <p className="flex items-center gap-2 self-center text-[0.95rem] text-pitch">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-pitch opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-pitch" />
            </span>
            Per paskutinę parą
          </p>
          <p>
            <span className="font-display text-[2.6rem] leading-none font-bold">{formatInteger(stats.any)}</span>{' '}
            <span className="text-haze">{ltPlural(stats.any, 'signalas', 'signalai', 'signalų')}</span>
          </p>
          {BOOKS.map((book) =>
            stats.perBook[book] === undefined ? null : (
              <p key={book}>
                <span className="font-display text-[1.7rem] leading-none font-bold">{formatInteger(stats.perBook[book]!)}</span>{' '}
                <span className="text-haze">{book}</span>
              </p>
            ),
          )}
          {stats.medianEdge !== null && (
            <p>
              <span className="font-display text-[1.7rem] leading-none font-bold text-floodlight">{formatEdge(stats.medianEdge)}</span>{' '}
              <span className="text-haze">tipinė vertė</span>
            </p>
          )}
        </div>
        <p className="text-[0.9rem] text-haze-dim">
          {stats.lastScanAt ? `Paskutinis skenavimas ${clockLabel(stats.lastScanAt)}. ` : ''}
          <Link href="/skaiciuokle" className="text-haze underline decoration-rail-strong underline-offset-4 hover:text-chalk">
            Kaip atrodo 1{' '}000 statymų
          </Link>
        </p>
      </div>
    </section>
  )
}
