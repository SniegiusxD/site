import Link from 'next/link'
import { formatInteger, ltPlural } from '@/lib/format-lt'
import type { PublicStats } from '@/lib/public-stats'

export function FinalCta({ stats }: { stats: PublicStats | null }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-rail">
      {/* Two floodlight cones rising from below the fold, the page's closing light. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -bottom-24 left-[58%] h-[38rem] w-[18rem] origin-bottom -rotate-[26deg] bg-[linear-gradient(to_top,rgb(255_210_63/0.28),transparent_78%)] blur-2xl" />
        <div className="absolute -bottom-24 left-[76%] h-[34rem] w-[15rem] origin-bottom rotate-[16deg] bg-[linear-gradient(to_top,rgb(238_242_247/0.14),transparent_72%)] blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(55%_100%_at_72%_100%,rgb(255_210_63/0.16),transparent_70%)]" />
      </div>
      <div className="mx-auto flex max-w-[80rem] flex-col items-start gap-8 px-5 py-24 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-32">
        <div>
          <h2 className="max-w-[46rem] text-[3rem] sm:text-[4.5rem]">Kitą kartą, kai kontora suklys, būk ten</h2>
          {stats && (
            <p className="mt-5 flex items-center gap-2.5 text-[1.05rem] text-haze">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-pitch opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-pitch" />
              </span>
              Per paskutinę parą radom {formatInteger(stats.any)} {ltPlural(stats.any, 'signalą', 'signalus', 'signalų')}.
            </p>
          )}
        </div>
        <div>
          <Link
            href="/registracija"
            className="inline-block rounded-xl bg-chalk px-7 py-4 text-[1.05rem] font-semibold text-night shadow-[0_0_40px_-8px_rgb(255_210_63/0.45)] transition-[transform,box-shadow] duration-200 hover:bg-white hover:shadow-[0_0_56px_-6px_rgb(255_210_63/0.6)] active:scale-[0.97]"
          >
            Išbandyti 7 dienas nemokamai
          </Link>
          <p className="mt-3 text-[0.9rem] text-haze-dim">Kortelės nereikia.</p>
        </div>
      </div>
    </section>
  )
}
