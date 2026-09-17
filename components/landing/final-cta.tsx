import Link from 'next/link'
import { ltPlural } from '@/lib/format-lt'
import type { PublicStats } from '@/lib/public-stats'
import { Reveal, Roll } from './motion-primitives'

export function FinalCta({ stats }: { stats: PublicStats | null }) {
  return (
    <section className="relative overflow-hidden bg-night px-5 py-[clamp(80px,10vw,140px)] sm:px-8">
      <div
        aria-hidden
        className="kr-breathe pointer-events-none absolute -top-[260px] left-1/2 -ml-[450px] h-[560px] w-[900px] bg-[radial-gradient(closest-side,rgb(91_229_132/0.18),transparent_70%)] [animation-duration:14s]"
      />
      <div className="relative mx-auto max-w-[60rem] text-center">
        <Reveal>
          <p className="font-display text-[clamp(2rem,4.5vw,3.5rem)] leading-none font-extrabold tracking-[-0.03em]">
            {stats ? (
              <>
                Per paskutinę parą radom <Roll value={stats.any} /> {ltPlural(stats.any, 'signalą', 'signalus', 'signalų')}
              </>
            ) : (
              'Kitą kartą, kai kontora suklys, būk ten'
            )}
          </p>
        </Reveal>
        <Reveal delay={120}>
          <Link
            href="/registracija"
            className="kr-cta-glow mt-8 inline-flex min-h-11 items-center rounded-[14px] bg-floodlight px-[26px] py-4 text-[1.0625rem] font-semibold text-night transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            Išbandyti 7 dienas nemokamai
          </Link>
        </Reveal>
        <p className="mx-auto mt-5 max-w-[48ch] text-[0.8125rem] text-haze">
          Tik nuo 18 metų. Lošimas gali sukelti priklausomybę. Vertė veikia per šimtus statymų, ir nė vienas statymas nėra saugus.
        </p>
      </div>
    </section>
  )
}
