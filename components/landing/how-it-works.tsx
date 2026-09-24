'use client'

import NumberFlow from '@number-flow/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatEdge, formatInteger, formatOdds } from '@/lib/format-lt'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import type { BookName } from '@/lib/landing-signals'
import { BookMark } from './book-mark'
import { Pills, Reveal, useInViewOnce } from './motion-primitives'

const MOVE = 'cubic-bezier(0.76, 0, 0.24, 1)'
const CARD = 'min-w-0 rounded-[20px] bg-white p-[clamp(20px,3vw,32px)] shadow-[inset_0_0_0_1px_rgb(11_31_23/0.08)]'
const H3 = 'text-[clamp(1.5rem,2.2vw,2rem)] leading-[1.05] tracking-[-0.02em] text-ink'

export function HowItWorks() {
  return (
    <section id="kaip" className="scroll-mt-16 bg-cream px-5 py-[clamp(80px,10vw,160px)] text-ink sm:px-8">
      <div className="mx-auto max-w-[80rem]">
        <Reveal>
          <h2 className="text-[clamp(2.25rem,4.5vw,4rem)] leading-[0.95] text-ink">Kaip tai veikia</h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mt-5 max-w-[64ch] text-[clamp(1.05rem,1.4vw,1.25rem)] leading-normal text-moss">
            Pinnacle yra tiksliausia kontora pasaulyje, todėl jos kaina rodo tikrą baigties tikimybę. Ieškom, kur Lietuvos kontora
            siūlo daugiau nei ji, ir tikrinam, ką tai reiškia po tūkstančio statymų.
          </p>
        </Reveal>
        <GapChapter />
        <ThousandChapter />
      </div>
    </section>
  )
}

/* Chapter 1: the true price is a line; the book that pays more pushes a green gap past it. */
function GapChapter() {
  const [gap, setGap] = useState(5)
  const low = 1.86
  const high = 2.18
  const at = (odds: number) => 4 + ((odds - low) / (high - low)) * 92
  const best = 2 * (1 + gap / 100)
  const books: Array<{ label: BookName; odds: number; value: boolean }> = [
    { label: 'Betsson', odds: best, value: true },
    { label: 'TopSport', odds: 1.96, value: false },
    { label: '7BET', odds: 1.92, value: false },
  ]

  return (
    <div className="mt-[clamp(64px,8vw,120px)] grid items-start gap-[clamp(28px,4vw,56px)] lg:grid-cols-2">
      <div className="min-w-0">
        <h3 className={H3}>Randam, kur kontora moka daugiau</h3>
        <p className="mt-3.5 max-w-[60ch] text-moss">
          Tikroji kaina yra linija. Kiekvienos kontoros koeficientas yra taškas prie tos linijos. Kai taškas ją peržengia, tarpas tarp jų
          yra tavo pranašumas, ir tik ta dalis nuspalvinta.
        </p>
        <div className="mt-6">
          <Pills
            tone="light"
            label="Pasirink tarpą, kurį nori pamatyti"
            options={[1, 2, 3, 5].map((value) => ({ value, label: `${value} %` }))}
            value={gap}
            onChange={setGap}
          />
        </div>
        <p className="mt-[18px] text-[0.9375rem] text-moss">
          Kai tikroji kaina 2,00, tarpas {formatEdge(gap / 100)} reiškia koeficientą {formatOdds(best)}.
        </p>
      </div>
      <div className={CARD}>
        <div className="flex items-baseline justify-between gap-3 text-[0.8125rem] text-moss">
          <span>Koeficientų ašis</span>
          <span>Tikroji kaina 2,00</span>
        </div>
        <div className="relative mt-[34px] h-[190px]">
          <div aria-hidden className="absolute inset-x-0 bottom-[34px] h-px bg-ink/[0.14]" />
          <div aria-hidden className="absolute top-0 bottom-[34px] w-0.5 bg-ink" style={{ left: `${at(2)}%` }} />
          <div aria-hidden className="absolute bottom-2.5 -translate-x-1/2 text-[0.75rem] text-ink" style={{ left: `${at(2)}%` }}>
            2,00
          </div>
          {books.map((book, row) => (
            <div key={book.label} className="absolute inset-x-0 h-[34px]" style={{ top: row * 52 }}>
              <div
                className="absolute top-2 h-3.5 rounded-full bg-floodlight transition-[width] duration-[620ms]"
                style={{ left: `${at(2)}%`, width: `${Math.max(0, at(book.odds) - at(2)).toFixed(2)}%`, transitionTimingFunction: MOVE }}
              />
              <div className="absolute top-0 -translate-x-1/2 transition-[left] duration-[620ms]" style={{ left: `${at(book.odds)}%`, transitionTimingFunction: MOVE }}>
                <div
                  className={`kr-float mx-auto mt-2 size-3.5 rounded-full shadow-[0_0_0_4px_#fff] ${book.value ? 'bg-field' : 'bg-moss'}`}
                  style={{ animationDelay: `${row * 0.7}s` }}
                />
              </div>
              {/* Labels never cross the 2,00 line: below it a label ends at its
                  dot; above it, a dot close to the line starts its label just
                  right of the line, a far one centres it under the dot. */}
              <div
                className={`absolute top-[24px] flex items-center gap-1.5 text-[0.8125rem] whitespace-nowrap text-moss transition-[left,translate] duration-[620ms] ${
                  !book.value ? '-translate-x-[calc(100%-0.5rem)]' : at(book.odds) - at(2) < 20 ? 'translate-x-2' : '-translate-x-1/2'
                }`}
                style={{ left: `${book.value && at(book.odds) - at(2) < 20 ? at(2) : at(book.odds)}%`, transitionTimingFunction: MOVE }}
              >
                <BookMark book={book.label} size="sm" />
                {book.label} <span className="font-semibold text-ink tnum">{formatOdds(book.odds)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2.5 border-t border-ink/10 pt-4">
          <span className="text-[0.9375rem] text-moss">Tavo pranašumas</span>
          <span className="font-display text-[clamp(1.75rem,3vw,2.5rem)] font-extrabold tracking-[-0.03em] text-field">
            <NumberFlow
              value={gap / 100}
              locales="lt-LT"
              format={{ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' }}
            />
          </span>
        </div>
      </div>
    </div>
  )
}

/* Chapter 2: 120 seeded runs of 1 000 bets draw themselves; the summary rolls in at the end. */
const PATHS = 120
const BETS = 1000
const SAMPLES = 50
const STAKE = 10

type Simulation = {
  paths: number[][]
  band: Array<[number, number, number]>
  median: number
  worst: number
  best: number
  negative: number
}

function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function simulate(valuePercent: number): Simulation {
  const random = seeded(9001 + valuePercent * 977)
  const paths: number[][] = []
  const finals: number[] = []
  for (let run = 0; run < PATHS; run++) {
    let units = 0
    const points = [0]
    for (let bet = 1; bet <= BETS; bet++) {
      // Odds spread roughly 1,45–2,80, like the signals; win chance carries the value.
      const odds = 1.45 * Math.exp(random() * 0.66)
      units += random() < (1 + valuePercent / 100) / odds ? odds - 1 : -1
      if (bet % (BETS / SAMPLES) === 0) points.push(units)
    }
    paths.push(points)
    finals.push(units)
  }
  const band = Array.from({ length: SAMPLES + 1 }, (_, step) => {
    const column = paths.map((path) => path[step]).sort((a, b) => a - b)
    return [column[Math.floor(0.05 * PATHS)], column[Math.floor(0.5 * PATHS)], column[Math.floor(0.95 * PATHS)]] as [number, number, number]
  })
  const sorted = [...finals].sort((a, b) => a - b)
  const at = (quantile: number) => sorted[Math.min(PATHS - 1, Math.floor(quantile * PATHS))] * STAKE
  return { paths, band, median: at(0.5), worst: at(0.05), best: at(0.95), negative: finals.filter((units) => units < 0).length / PATHS }
}

function drawSimulation(canvas: HTMLCanvasElement | null, sim: Simulation, progress: number) {
  if (!canvas) return
  const ratio = Math.min(2, window.devicePixelRatio || 1)
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }
  const context = canvas.getContext('2d')
  if (!context) return
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)

  const pad = 10
  let low = 0
  let high = 0
  for (const [worst, , best] of sim.band) {
    low = Math.min(low, worst)
    high = Math.max(high, best)
  }
  low = low * STAKE * 1.2 - 20
  high = high * STAKE * 1.2 + 20
  const x = (step: number) => pad + (width - 2 * pad) * (step / SAMPLES)
  const y = (units: number) => height - pad - (height - 2 * pad) * ((units * STAKE - low) / (high - low))

  context.strokeStyle = 'rgba(74,99,88,.4)'
  context.lineWidth = 1
  context.beginPath()
  context.moveTo(pad, y(0))
  context.lineTo(width - pad, y(0))
  context.stroke()
  context.fillStyle = 'rgba(74,99,88,.9)'
  context.font = `11px ${getComputedStyle(canvas).fontFamily}`
  context.fillText('0 €', pad + 2, y(0) - 5)

  context.strokeStyle = 'rgba(74,99,88,.17)'
  sim.paths.forEach((path, index) => {
    const part = Math.min(1, progress * 1.4 - (index / sim.paths.length) * 0.4)
    if (part <= 0) return
    const steps = Math.max(1, Math.floor(part * SAMPLES))
    context.beginPath()
    context.moveTo(x(0), y(path[0]))
    for (let step = 1; step <= steps; step++) context.lineTo(x(step), y(path[step]))
    context.stroke()
  })

  if (progress > 0.6) {
    context.fillStyle = `rgba(14,122,67,${(0.15 * Math.min(1, (progress - 0.6) / 0.25)).toFixed(3)})`
    context.beginPath()
    context.moveTo(x(0), y(sim.band[0][2]))
    for (let step = 0; step <= SAMPLES; step++) context.lineTo(x(step), y(sim.band[step][2]))
    for (let step = SAMPLES; step >= 0; step--) context.lineTo(x(step), y(sim.band[step][0]))
    context.closePath()
    context.fill()
  }
  if (progress > 0.72) {
    const steps = Math.max(1, Math.floor(Math.min(1, (progress - 0.72) / 0.28) * SAMPLES))
    context.strokeStyle = '#0B1F17'
    context.lineWidth = 2.5
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(x(0), y(sim.band[0][1]))
    for (let step = 1; step <= steps; step++) context.lineTo(x(step), y(sim.band[step][1]))
    context.stroke()
  }
}

const EURO_ROLL = { maximumFractionDigits: 0, signDisplay: 'exceptZero' } as const

function ThousandChapter() {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(2)
  const sim = useMemo(() => simulate(value), [value])
  const canvas = useRef<HTMLCanvasElement>(null)
  const counter = useRef<HTMLSpanElement>(null)
  const [ref, seen] = useInViewOnce<HTMLDivElement>('0px 0px -20% 0px')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!seen) return
    let frame = 0
    const onResize = () => drawSimulation(canvas.current, sim, 1)
    window.addEventListener('resize', onResize)
    if (reduced) {
      drawSimulation(canvas.current, sim, 1)
      if (counter.current) counter.current.textContent = formatInteger(BETS)
    } else {
      const start = performance.now()
      let rolled = false
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / 1400)
        const eased = 1 - Math.pow(1 - t, 3)
        drawSimulation(canvas.current, sim, eased)
        if (counter.current) counter.current.textContent = formatInteger(Math.round(eased * BETS))
        // The summary starts rolling with the median line, so both land together.
        if (!rolled && eased > 0.55) {
          rolled = true
          setDone(true)
        }
        if (t < 1) frame = window.requestAnimationFrame(step)
      }
      frame = window.requestAnimationFrame(step)
    }
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [seen, sim, reduced])

  const inTen = Math.max(1, Math.round(sim.negative * 10))
  // In calm mode the run is drawn finished at once, so the summary is there too.
  const summary = done || (reduced && seen)

  return (
    <div id="tukstantis" ref={ref} className="mt-[clamp(64px,8vw,120px)] grid scroll-mt-24 items-start gap-[clamp(28px,4vw,56px)] lg:grid-cols-2">
      <div className="min-w-0">
        <h3 className={H3}>Vienas statymas nieko nereiškia. Tūkstantis reiškia.</h3>
        <p className="mt-3.5 max-w-[60ch] text-moss">
          120 atsitiktinių kelių po 1 000 statymų, kiekvienas po 10 €, koeficientai apie 2,0. Tamsi linija yra mediana, šviesesnė juosta
          apima nuo 5 iki 95 procentilio. Kai kurie keliai baigiasi minuse, ir tai normalu.
        </p>
        <div className="mt-6">
          <Pills
            tone="light"
            label="Vidutinė vertė vienam statymui"
            options={[1, 2, 3, 5].map((option) => ({ value: option, label: `${option} %` }))}
            value={value}
            onChange={(next) => {
              // The summary waits for the new run to reach the median line.
              setDone(false)
              setValue(next)
            }}
          />
        </div>
        <p className="mt-[18px] text-[0.9375rem] text-moss" aria-live="polite">
          {summary
            ? `Simuliacija, ne pažadas. Su ${value} % verte maždaug ${inTen} iš 10 tokių kelių baigiasi minuse.`
            : 'Simuliacija, ne pažadas.'}
        </p>
      </div>
      <div className="min-w-0 lg:sticky lg:top-24">
        <div className="rounded-[20px] bg-white p-[clamp(16px,2.4vw,24px)] shadow-[inset_0_0_0_1px_rgb(11_31_23/0.08)]">
          <div className="mb-2.5 flex items-baseline justify-between gap-3 text-[0.8125rem] text-moss">
            <span>Rezultatas, €</span>
            <span>
              Statymų:{' '}
              <span ref={counter} className="font-semibold text-ink tnum">
                0
              </span>
            </span>
          </div>
          <canvas
            ref={canvas}
            role="img"
            aria-label={`Tūkstančio statymų simuliacija su ${value} % verte: vidurys ${Math.round(sim.median)} €, blogiausi 5 % ${Math.round(sim.worst)} €, geriausi 5 % ${Math.round(sim.best)} €, minuse baigėsi ${Math.round(sim.negative * 100)} % kelių.`}
            className="block h-[clamp(220px,28vw,300px)] w-full"
          />
          <dl className="mt-[18px] grid grid-cols-2 gap-3.5 border-t border-ink/10 pt-4 sm:grid-cols-4">
            {[
              { label: 'Vidurys', value: sim.median, tone: 'text-ink' },
              { label: 'Blogiausi 5 %', value: sim.worst, tone: 'text-coral' },
              { label: 'Geriausi 5 %', value: sim.best, tone: 'text-field' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="sr-only">{item.label}</dt>
                <dd className={`font-display text-[1.25rem] font-bold tracking-[-0.02em] ${item.tone}`}>
                  <NumberFlow value={summary ? Math.round(item.value) : 0} locales="lt-LT" format={EURO_ROLL} suffix=" €" />
                </dd>
                <p aria-hidden className="text-[0.8125rem] text-moss">
                  {item.label}
                </p>
              </div>
            ))}
            <div>
              <dt className="sr-only">Baigė minuse</dt>
              <dd className="font-display text-[1.25rem] font-bold tracking-[-0.02em] text-ink">
                <NumberFlow value={summary ? Math.round(sim.negative * 100) : 0} locales="lt-LT" suffix=" %" />
              </dd>
              <p aria-hidden className="text-[0.8125rem] text-moss">
                Baigė minuse
              </p>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
