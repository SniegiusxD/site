'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { PublicStats } from '@/lib/public-stats'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { HeroBoard } from './hero-board'

export function Hero({ stats }: { stats: PublicStats | null }) {
  const light = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  // A soft floodlight follows the mouse across the hero; touch and reduced motion skip it.
  function follow(event: React.PointerEvent<HTMLElement>) {
    const element = light.current
    if (!element || reduced || event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    element.style.opacity = '1'
    element.style.translate = `${(event.clientX - box.left).toFixed(0)}px ${(event.clientY - box.top).toFixed(0)}px`
  }

  return (
    <section
      className="relative overflow-hidden pt-24 pb-16 sm:pt-28 lg:pt-32 lg:pb-28"
      onPointerMove={follow}
      onPointerLeave={() => {
        if (light.current) light.current.style.opacity = '0'
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[-20%] top-[-80px] h-[1040px] [mask-image:radial-gradient(90%_70%_at_88%_6%,#000,transparent_62%)]"
      >
        <div className="kr-stripes absolute inset-y-0 -left-[272px] right-0" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-[-20%_-40%] animate-[kr-sweep_16s_cubic-bezier(.55,0,.45,1)_infinite_alternate] bg-[linear-gradient(112deg,transparent_42%,rgb(234_246_238/0.05)_50%,transparent_58%)]" />
        <div
          ref={light}
          className="absolute top-0 left-0 -mt-[260px] -ml-[260px] size-[520px] bg-[radial-gradient(closest-side,rgb(91_229_132/0.13),transparent_72%)] opacity-0 transition-[opacity,translate] duration-500 ease-out"
        />
      </div>
      <div
        aria-hidden
        className="kr-breathe pointer-events-none absolute -top-[220px] -right-[120px] h-[620px] w-[760px] bg-[radial-gradient(closest-side,rgb(91_229_132/0.16),transparent_70%)]"
      />

      <div className="relative mx-auto grid max-w-[80rem] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,38rem)] xl:gap-14">
        <div className="min-w-0">
          <h1 className="text-[clamp(2.75rem,7vw,6rem)] leading-[0.95]">
            <span className="block overflow-hidden pb-[0.14em]">
              {/* The rotating word ends its own line: its width changes only the
                  empty space after it, so no line ever re-wraps (layout shift). */}
              <span className="kr-line block" style={{ animationDelay: '80ms' }}>
                Kai <BookRotator />
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.04em]">
              <span className="kr-line block" style={{ animationDelay: '140ms' }}>
                suklysta, tu tai matai pirmas
              </span>
            </span>
          </h1>
          <p className="kr-fade-up mt-6 max-w-[56ch] text-[clamp(1.05rem,1.4vw,1.25rem)] leading-normal text-haze" style={{ animationDelay: '320ms' }}>
            Visą parą lyginam 7BET, TopSport ir Betsson koeficientus su Pinnacle kaina be maržos. Kai Lietuvos kontora už statymą moka
            daugiau, nei jis vertas, gauni signalą.
          </p>
          <div className="kr-pop mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '460ms' }}>
            <Link
              href="/registracija"
              className="kr-cta-glow flex min-h-11 items-center rounded-[14px] bg-floodlight px-[26px] py-4 text-[1.0625rem] font-semibold text-night transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
            >
              Sukurti nemokamą paskyrą
            </Link>
            <Link href="/demo" className="border-b border-rail py-3 font-medium text-chalk transition-colors hover:border-chalk">
              Pažiūrėk tikrą signalą
            </Link>
          </div>
          <p className="kr-fade mt-5 text-[0.9375rem] text-haze" style={{ animationDelay: '520ms' }}>
            Registracija nemokama ir be termino. Visi signalai — 25 € per mėnesį, prieš tai 7 dienos nemokamai.
          </p>
        </div>

        <div className="kr-rise min-w-0" style={{ animationDelay: '520ms' }}>
          <HeroBoard stats={stats} />
        </div>
      </div>
    </section>
  )
}

const WORDS = ['kontora', '7BET', 'TopSport', 'Betsson']

/**
 * "kontora" rolls through the three bookmakers. Each word's width is measured with
 * a ResizeObserver, so it re-measures when the web font arrives and never clips.
 */
function BookRotator() {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [widths, setWidths] = useState<number[] | null>(null)
  const words = useRef<Array<HTMLSpanElement | null>>([])

  useEffect(() => {
    const measure = () => setWidths(words.current.map((element) => element?.getBoundingClientRect().width ?? 0))
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    words.current.forEach((element) => element && observer?.observe(element))
    document.fonts?.ready.then(measure).catch(() => {})
    return () => observer?.disconnect()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((current) => (current + 1) % WORDS.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [])

  const width = widths?.[index]
  return (
    <>
      <span className="sr-only">kontora</span>
      <span
        aria-hidden
        className="relative inline-flex h-[1.05em] overflow-hidden align-bottom transition-[width] duration-[420ms] ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ width: width ? Math.ceil(width) + 2 : undefined }}
      >
        <span
          className={`flex flex-col items-start ${reduced ? '' : 'transition-transform duration-[420ms] ease-[cubic-bezier(.76,0,.24,1)]'}`}
          style={{ transform: `translateY(${-index * 1.05}em)` }}
        >
          {WORDS.map((word, position) => (
            <span
              key={word}
              ref={(element) => {
                words.current[position] = element
              }}
              className={`block h-[1.05em] w-max leading-[1.05] whitespace-nowrap ${position === 0 ? '' : 'text-floodlight'}`}
            >
              {word}
            </span>
          ))}
        </span>
      </span>
    </>
  )
}
