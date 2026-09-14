'use client'

import NumberFlow from '@number-flow/react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

const EASE = [0.22, 1, 0.36, 1] as const

const STEPS = [
  {
    title: 'Nuimam Pinnacle maržą',
    body: 'Pinnacle priima didelius statymus ir neriboja laimėtojų, todėl jo kainas nuolat taiso stipriausi lošėjai. Kaip ir kiekviena kontora, į kainą jis įdeda maržą. Ją nuėmę gaunam tikrąją kainą.',
  },
  {
    title: 'Randam kontorą, kuri moka daugiau',
    body: 'Jei Lietuvos kontora už tą pačią baigtį moka daugiau už tikrąją kainą, skirtumas yra tavo pranašumas. Ilgainiui toks statymas vidutiniškai grąžina daugiau, nei kainuoja.',
  },
  {
    title: 'Statai daug kartų po nedaug',
    body: 'Vienas statymas vis tiek gali pralaimėti. Pranašumas išryškėja tik per šimtus statymų, todėl siūlom mažas sumas. Pajudink vertę ir pažiūrėk, kaip atrodo 1 000 statymų.',
  },
] as const

export function MathStory() {
  const [active, setActive] = useState(0)

  return (
    <section id="kaip-veikia" className="scroll-mt-16 border-t border-rail">
      <div className="mx-auto max-w-[80rem] px-5 py-24 sm:px-8 lg:py-32">
        <div className="max-w-[44rem]">
          <h2 className="text-[3rem] sm:text-[4rem]">Matematika, ne nuojauta</h2>
          <p className="mt-6 text-[1.1rem] text-haze">
            Visa idėja telpa į tris žingsnius. Paaiškinimui naudojam apvalius skaičius, o tikrus
            signalus matei viršuje.
          </p>
        </div>

        <div className="mt-16 lg:grid lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <ol>
            {STEPS.map((step, index) => (
              <Step key={step.title} index={index} onActive={setActive} active={active === index}>
                <h3 className="text-[2rem] sm:text-[2.4rem]">{step.title}</h3>
                <p className="mt-4 max-w-[32rem] text-haze">{step.body}</p>
                <div className="mt-8 lg:hidden">
                  <Visual step={index} />
                </div>
              </Step>
            ))}
          </ol>
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <Visual step={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Step({
  index,
  active,
  onActive,
  children,
}: {
  index: number
  active: boolean
  onActive: (index: number) => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLLIElement>(null)
  const inView = useInView(ref, { margin: '-30% 0px -60% 0px' })

  useEffect(() => {
    if (inView) onActive(index)
  }, [inView, index, onActive])

  return (
    <li
      ref={ref}
      className="flex gap-6 py-10 first:pt-0 lg:min-h-[78vh] lg:pt-8 lg:pb-0 lg:first:pt-8"
    >
      <span
        aria-hidden
        className={`mt-1 grid size-10 shrink-0 place-items-center rounded-full font-display text-xl font-extrabold transition-colors duration-300 ${
          active ? 'bg-chalk text-night' : 'bg-rail text-haze'
        }`}
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  )
}

function Visual({ step }: { step: number }) {
  if (step === 0) return <MarginVisual />
  if (step === 1) return <GapVisual />
  return <SimulationVisual />
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="lift rounded-2xl bg-stand p-6 sm:p-8">{children}</div>
}

/* Step 1: 1.90 / 1.90 carries a 5.3 % margin; removing it gives 2.00 / 2.00. */
function MarginVisual() {
  const reduced = useReducedMotion()
  const [fair, setFair] = useState(Boolean(reduced))

  useEffect(() => {
    if (reduced) return
    const timer = window.setTimeout(() => setFair(true), 1100)
    return () => window.clearTimeout(timer)
  }, [reduced])

  // Bar scale runs to 110 % so the margin visibly overhangs the 100 % line.
  const share = fair ? 50 : 100 / 1.9
  const width = (share / 110) * 100
  const odds = fair ? 2 : 1.9

  return (
    <Panel>
      <div className="flex items-baseline justify-between">
        <p className="text-haze">Tikimybių suma</p>
        <p className="font-display text-4xl font-bold tnum">
          <NumberFlow value={share * 2} format={{ maximumFractionDigits: 1 }} locales="lt-LT" suffix=" %" />
        </p>
      </div>

      <div className="relative mt-5 h-14">
        <div className="absolute inset-0 flex gap-1">
          <motion.div
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.9, ease: EASE }}
            className="grid place-items-center rounded-l-lg bg-chalk text-[0.9rem] font-semibold text-night"
          >
            Daugiau
          </motion.div>
          <motion.div
            animate={{ width: `${width}%` }}
            transition={{ duration: 0.9, ease: EASE }}
            className="grid place-items-center rounded-r-lg bg-steel text-[0.9rem] font-semibold text-chalk"
          >
            Mažiau
          </motion.div>
        </div>
        <div
          className="absolute -inset-y-2 w-0.5 rounded bg-floodlight"
          style={{ left: `${(100 / 110) * 100}%` }}
        />
        <span
          className="absolute -bottom-7 -translate-x-1/2 text-[0.8rem] text-floodlight"
          style={{ left: `${(100 / 110) * 100}%` }}
        >
          100 %
        </span>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-4">
        {['Daugiau', 'Mažiau'].map((side) => (
          <div key={side} className="rounded-xl bg-night/60 p-4">
            <p className="text-[0.9rem] text-haze">{side}</p>
            <p className="mt-1 font-display text-4xl font-bold tnum">
              <NumberFlow
                value={odds}
                format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }}
                locales="lt-LT"
              />
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-[0.95rem] text-haze">
          {fair
            ? 'Be maržos abi baigtys po 2,00. Tai tikroji kaina.'
            : 'Su marža kontora už abi baigtis moka po 1,90.'}
        </p>
        <button
          type="button"
          onClick={() => setFair((value) => !value)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-rail px-3 py-2 text-[0.9rem] font-medium transition-colors hover:bg-rail-strong"
        >
          <RotateCcw className="size-4" aria-hidden />
          {fair ? 'Grąžinti maržą' : 'Nuimti maržą'}
        </button>
      </div>
    </Panel>
  )
}

/* Step 2: one book pays 2.10 against a fair 2.00. */
function GapVisual() {
  const reduced = useReducedMotion()
  const [bookOdds, setBookOdds] = useState(2.1)
  const low = 1.8
  const high = 2.3
  const at = (odds: number) => ((odds - low) / (high - low)) * 100
  const edge = bookOdds / 2 - 1
  const sliderId = useId()

  return (
    <Panel>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-haze">Tavo pranašumas</p>
        <p
          className={`font-display text-5xl font-bold tnum transition-colors ${
            edge > 0 ? 'text-floodlight' : 'text-haze'
          }`}
        >
          <NumberFlow
            value={edge * 100}
            format={{ maximumFractionDigits: 1, minimumFractionDigits: 1, signDisplay: 'exceptZero' }}
            locales="lt-LT"
            suffix=" %"
          />
        </p>
      </div>

      <div className="relative mt-10 h-16">
        <div className="absolute inset-x-0 top-6 h-3 rounded-full bg-rail" />
        {edge > 0 && (
          <motion.div
            className="absolute top-6 h-3 bg-floodlight"
            animate={{ left: `${at(2)}%`, width: `${at(bookOdds) - at(2)}%` }}
            transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE }}
          />
        )}
        <div className="absolute top-3 h-9 w-0.5 rounded bg-chalk" style={{ left: `${at(2)}%` }} />
        <span
          className="absolute -top-3 -translate-x-1/2 text-[0.85rem] whitespace-nowrap text-chalk"
          style={{ left: `${at(2)}%` }}
        >
          Tikroji 2,00
        </span>
        <motion.span
          className="absolute top-12 -translate-x-1/2 text-[0.85rem] font-semibold whitespace-nowrap tnum"
          animate={{ left: `${at(bookOdds)}%` }}
          transition={reduced ? { duration: 0 } : { duration: 0.4, ease: EASE }}
        >
          Kontora {bookOdds.toFixed(2).replace('.', ',')}
        </motion.span>
      </div>

      <label htmlFor={sliderId} className="mt-10 block text-[0.95rem] text-haze">
        Kiek moka kontora
      </label>
      <input
        id={sliderId}
        type="range"
        min={1.85}
        max={2.25}
        step={0.01}
        value={bookOdds}
        onChange={(event) => setBookOdds(Number(event.target.value))}
        className="mt-3 w-full accent-floodlight"
      />

      <div className="mt-6 rounded-xl bg-night/60 p-4">
        <p className="text-[0.9rem] text-haze">100 € tokių statymų vidutiniškai grąžina</p>
        <p className="mt-1 font-display text-4xl font-bold tnum">
          <NumberFlow
            value={100 * (1 + edge)}
            format={{ minimumFractionDigits: 0, maximumFractionDigits: 0 }}
            locales="lt-LT"
            suffix=" €"
          />
        </p>
      </div>
    </Panel>
  )
}

/* Step 3: 200 simulated runs of 1,000 bets at odds 2.00, 5 € each. */
const BETS = 1000
const RUNS = 200
const SAMPLE_EVERY = 10
const ODDS = 2
const STAKE = 5
const Y_MIN = -350
const Y_MAX = 600
const CHART_W = 600
const CHART_H = 300

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function simulate(edge: number) {
  // The same seed for every edge, so the runs shift smoothly as the slider moves.
  const random = mulberry32(20260914)
  const winChance = (1 + edge) / ODDS
  const points = BETS / SAMPLE_EVERY + 1
  const runs: number[][] = []
  for (let run = 0; run < RUNS; run++) {
    const line = [0]
    let profit = 0
    for (let bet = 1; bet <= BETS; bet++) {
      profit += random() < winChance ? STAKE * (ODDS - 1) : -STAKE
      if (bet % SAMPLE_EVERY === 0) line.push(profit)
    }
    runs.push(line)
  }
  const p5: number[] = []
  const p50: number[] = []
  const p95: number[] = []
  for (let k = 0; k < points; k++) {
    const column = runs.map((line) => line[k]).sort((a, b) => a - b)
    p5.push(column[Math.floor(RUNS * 0.05)])
    p50.push(column[Math.floor(RUNS * 0.5)])
    p95.push(column[Math.floor(RUNS * 0.95)])
  }
  const finals = runs.map((line) => line[points - 1])
  return {
    runs: runs.slice(0, 18),
    p5,
    p50,
    p95,
    losingShare: finals.filter((value) => value < 0).length / RUNS,
  }
}

const x = (k: number) => (k / (BETS / SAMPLE_EVERY)) * CHART_W
const y = (value: number) =>
  CHART_H - ((Math.min(Y_MAX, Math.max(Y_MIN, value)) - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H
const linePath = (values: number[]) =>
  values.map((value, k) => `${k === 0 ? 'M' : 'L'}${x(k).toFixed(1)},${y(value).toFixed(1)}`).join('')

function SimulationVisual() {
  const [edgePercent, setEdgePercent] = useState(2)
  const sim = useMemo(() => simulate(edgePercent / 100), [edgePercent])
  const sliderId = useId()
  const last = sim.p50.length - 1

  const band =
    sim.p95.map((value, k) => `${k === 0 ? 'M' : 'L'}${x(k).toFixed(1)},${y(value).toFixed(1)}`).join('') +
    sim.p5
      .map((_, index) => {
        const k = sim.p5.length - 1 - index
        return `L${x(k).toFixed(1)},${y(sim.p5[k]).toFixed(1)}`
      })
      .join('') +
    'Z'

  const euro = { maximumFractionDigits: 0, signDisplay: 'exceptZero' } as const

  return (
    <Panel>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={sliderId} className="text-haze">
          Tarkim, vidutinė vertė
        </label>
        <p className="font-display text-4xl font-bold text-floodlight tnum">
          <NumberFlow
            value={edgePercent}
            format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
            locales="lt-LT"
            suffix=" %"
          />
        </p>
      </div>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={6}
        step={0.5}
        value={edgePercent}
        onChange={(event) => setEdgePercent(Number(event.target.value))}
        className="mt-3 w-full accent-floodlight"
      />

      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        className="mt-6 h-56 w-full sm:h-64"
        role="img"
        aria-label={`200 simuliacijų po 1000 statymų: vidurys ${Math.round(sim.p50[last])} €, blogiausi 5 % ${Math.round(sim.p5[last])} €, geriausi 5 % ${Math.round(sim.p95[last])} €`}
      >
        <line x1={0} x2={CHART_W} y1={y(0)} y2={y(0)} stroke="var(--rail-strong)" strokeDasharray="6 6" />
        <motion.path animate={{ d: band }} transition={{ duration: 0.5, ease: EASE }} fill="rgb(141 152 173 / 0.14)" />
        {sim.runs.map((run, index) => (
          <motion.path
            key={index}
            animate={{ d: linePath(run) }}
            transition={{ duration: 0.5, ease: EASE }}
            fill="none"
            stroke="rgb(141 152 173 / 0.28)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <motion.path
          animate={{ d: linePath(sim.p50) }}
          transition={{ duration: 0.5, ease: EASE }}
          fill="none"
          stroke="var(--chalk)"
          strokeWidth={2.5}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[0.8rem] text-haze-dim">
        <span>0</span>
        <span>1 000 statymų po 5 €</span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-rail sm:grid-cols-4">
        <Stat label="Vidurys">
          <NumberFlow value={Math.round(sim.p50[last])} format={euro} locales="lt-LT" suffix=" €" />
        </Stat>
        <Stat label="Blogiausi 5 %" tone={sim.p5[last] < 0 ? 'text-brick' : undefined}>
          <NumberFlow value={Math.round(sim.p5[last])} format={euro} locales="lt-LT" suffix=" €" />
        </Stat>
        <Stat label="Geriausi 5 %">
          <NumberFlow value={Math.round(sim.p95[last])} format={euro} locales="lt-LT" suffix=" €" />
        </Stat>
        <Stat label="Baigė minuse">
          <NumberFlow value={Math.round(sim.losingShare * 100)} locales="lt-LT" suffix=" %" />
        </Stat>
      </dl>
      <p className="mt-4 text-[0.85rem] text-haze-dim">
        Simuliacija, ne pažadas. Tikrą mūsų signalų vertę matuojam CLV, žr. rezultatus žemiau.
      </p>
    </Panel>
  )
}

function Stat({ label, tone, children }: { label: string; tone?: string; children: React.ReactNode }) {
  return (
    <div className="bg-stand p-4">
      <dt className="text-[0.8rem] text-haze">{label}</dt>
      <dd className={`mt-1 font-display text-2xl font-bold tnum ${tone ?? ''}`}>{children}</dd>
    </div>
  )
}
