'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { formatEdge, formatInteger, formatOdds } from '@/lib/format-lt'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { BookMark } from './book-mark'
import { Reveal, useInViewOnce } from './motion-primitives'
import { EASE } from '@/lib/motion'

// Four real surfaced bets with a captured close, from the aggregator's CLV
// database (data/clv.db, surfaced_bets), read 2026-09-19. `close` is the
// closing price with Pinnacle's margin removed: 1 / closing_fair_prob. The
// worst one is here on purpose — a page that shows only the winners is a
// brochure, not evidence.
const RUNS = [
  {
    fixture: 'Walter Tigers Tübingen – Starwings Basket',
    pick: 'Handikapas +10,5',
    book: '7BET' as const,
    entry: 1.7408,
    close: 2.5518,
    clv: -0.3178,
  },
  {
    fixture: 'Gorica – KK Samobor',
    pick: 'Handikapas +19,5',
    book: '7BET' as const,
    entry: 1.7143,
    close: 1.8532,
    clv: -0.075,
  },
  {
    fixture: 'Monteiro – Hijikata',
    pick: 'Geimų suma: daugiau 11,5',
    book: 'TopSport' as const,
    entry: 1.58,
    close: 1.5618,
    clv: 0.0117,
  },
  {
    fixture: 'Hanshin Tigers – Hiroshima Toyo Carp',
    pick: 'Hiroshima suma: mažiau 1,5',
    book: '7BET' as const,
    entry: 2.35,
    close: 2.1661,
    clv: 0.0849,
  },
]

// Same database, every bet with a captured close between 2026-09-05 and
// 2026-09-19.
const SAMPLE = { bets: 5887, beat: 0.595, mean: 0.0148, median: 0.011 }

/** How far from the closing line a full half-bar reaches. */
const SPAN = 0.35

/**
 * The closing price is the market's last and most accurate word on a fixture.
 * Beating it is the only thing a service can be judged on before the results
 * arrive — and it is where most of them quietly lose, so ours is shown with
 * its losses in it.
 */
export function ClosingLine() {
  const reduced = useReducedMotion()
  const [ref, seen] = useInViewOnce<HTMLUListElement>()

  return (
    <section id="uzdarymas" className="scroll-mt-16 bg-night px-5 py-[clamp(80px,10vw,160px)] sm:px-8">
      <div className="mx-auto grid max-w-[80rem] gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div>
          <Reveal>
            <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95]">
              Kaina juda.
              <br />
              Matuojam kur.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-5 max-w-[44ch] text-[clamp(1.05rem,1.4vw,1.2rem)] leading-normal text-haze">
              Prieš pat pradžią rinka apie rungtynes žino viską, ką sužinos. Paskutinė Pinnacle kaina be maržos yra artimiausias
              tiesai skaičius, kokį turim. Jei pagauta kaina buvo geresnė už ją, pirkai pigiau, nei rinka galiausiai įkainojo.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-4 max-w-[44ch] leading-normal text-haze-dim">
              Tai matuoja kainos kokybę, o ne pelną. Geresnė kaina negarantuoja nieko šitame statyme — ji atsiperka per šimtus.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <Link
              href="/metodika"
              className="mt-7 inline-flex border-b border-rail py-2 font-medium transition-colors hover:border-chalk"
            >
              Kaip tai išmatuota
            </Link>
          </Reveal>
        </div>

        <div>
          {/* Every bar hangs off one line: the closing price. */}
          <div className="relative">
            <p className="text-center text-[0.8rem] tracking-[0.04em] text-haze-dim">uždarymo kaina</p>
            {/* The line is drawn only where the bars are, so it never runs
                through a match name or the caption under a bar. */}
            <span aria-hidden className="mx-auto mb-3 block h-3 w-px bg-rail-strong" />
            <ul ref={ref} className="grid gap-6">
            {RUNS.map((run, index) => {
              const reach = Math.min(Math.abs(run.clv) / SPAN, 1) * 50
              const width = `${reach}%`
              const beat = run.clv > 0
              // A long bar reaches the edge of the phone, so its number moves inside it.
              const inside = reach >= 20
              return (
                <li key={run.fixture}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 pr-4 sm:max-w-[calc(50%-0.75rem)]">
                    <p className="text-[1.05rem]">{run.fixture}</p>
                    <p className="flex items-center gap-1.5 text-[0.875rem] text-haze">
                      <BookMark book={run.book} size="sm" />
                      {run.pick}
                    </p>
                  </div>
                  <div className="relative mt-2 h-8">
                    <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-rail-strong" />
                    <motion.span
                      aria-hidden
                      initial={reduced ? false : { width: 0 }}
                      animate={{ width: seen || reduced ? width : 0 }}
                      transition={{ duration: 0.7, delay: reduced ? 0 : 0.08 * index, ease: EASE }}
                      style={beat ? { left: '50%' } : { right: '50%' }}
                      className={`absolute inset-y-2 ${beat ? 'rounded-r-full bg-floodlight' : 'rounded-l-full bg-brick'}`}
                    />
                    <span
                      className={`absolute inset-y-0 flex items-center px-3 text-[0.95rem] font-semibold tnum ${
                        beat ? 'left-1/2' : 'right-1/2'
                      } ${inside ? 'text-night' : beat ? 'text-floodlight' : 'text-brick'}`}
                      style={inside ? undefined : beat ? { marginLeft: width } : { marginRight: width }}
                    >
                      {formatEdge(run.clv)}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.9rem] text-haze-dim">
                    pagavom <span className="text-haze tnum">{formatOdds(run.entry)}</span>, uždarė ties{' '}
                    <span className="text-haze tnum">{formatOdds(run.close)}</span>
                  </p>
                </li>
              )
            })}
            </ul>
          </div>

          <p className="mt-9 max-w-[70ch] border-t border-rail pt-5 text-[0.95rem] leading-normal text-haze">
            Iš {formatInteger(SAMPLE.bets)} statymų, kuriems spėjom užfiksuoti uždarymo kainą (2026 09 05–09 19),{' '}
            <span className="text-chalk">59,5 %</span> pagavo geresnę kainą nei uždarymas. Vidurkis {formatEdge(SAMPLE.mean)}, mediana{' '}
            {formatEdge(SAMPLE.median)}. Likę 40,5 % buvo prastesni, ir tokių čia irgi yra.
          </p>
        </div>
      </div>
    </section>
  )
}
