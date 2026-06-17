"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Activity, ArrowRight, Clock, Wallet } from "lucide-react"
import { useEffect, useState } from "react"
import { BookmakerLogo } from "@/components/shared/bookmaker-logo"
import { Button } from "@/components/ui/button"
import { eur0 } from "@/lib/format"
import type { Bookmaker } from "@/lib/types"

const TEASER_BOOKS: Bookmaker[] = ["7BET", "TopSport", "Pinnacle"]
const BANKROLLS = [100, 300, 500, 1000]
const HOURS = [
  { key: 30, label: "30 min" },
  { key: 60, label: "1 val." },
  { key: 120, label: "2 val." },
]

const TOTAL = 5

export type FunnelResult = { bankroll: number; minutes: number }

type Props = {
  onComplete: (result: FunnelResult) => void
}

export function IntroFunnel({ onComplete }: Props) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [bankroll, setBankroll] = useState(500)
  const [minutes, setMinutes] = useState(60)

  const next = () => setStep((s) => Math.min(s + 1, TOTAL - 1))

  const variants = {
    enter: { opacity: 0, x: reduce ? 0 : 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduce ? 0 : -40 },
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <BackdropGlow />

      <div className="relative z-10 flex items-center justify-center gap-2 pt-8">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-8 bg-primary" : i < step ? "w-2 bg-primary/40" : "w-2 bg-border"
            }`}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10">
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="flex flex-1 flex-col justify-center"
          >
            {step === 0 && <CounterScreen onNext={next} reduce={!!reduce} />}
            {step === 1 && <ErrorCardScreen onNext={next} reduce={!!reduce} />}
            {step === 2 && <MathScreen onNext={next} reduce={!!reduce} />}
            {step === 3 && (
              <BankrollScreen
                value={bankroll}
                onChange={setBankroll}
                onNext={next}
              />
            )}
            {step === 4 && (
              <TimeScreen
                value={minutes}
                onChange={setMinutes}
                onNext={() => onComplete({ bankroll, minutes })}
              />
            )}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------- Screen 1: Live counter ---------- */

const TARGET = 200

function CounterScreen({ onNext, reduce }: { onNext: () => void; reduce: boolean }) {
  const [count, setCount] = useState(0)
  const [delta, setDelta] = useState(1)
  const [phase, setPhase] = useState<"counting" | "live">("counting")

  // Count up to the target (fast even under reduced motion).
  useEffect(() => {
    if (phase !== "counting") return
    const start = performance.now()
    const duration = reduce ? 600 : 1600
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(eased * TARGET))
      if (t < 1) raf = requestAnimationFrame(tick)
      else {
        setCount(TARGET)
        setPhase("live")
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, reduce])

  // Live phase: the number keeps moving, ALWAYS — even with reduced motion.
  useEffect(() => {
    if (phase !== "live") return
    let timer: ReturnType<typeof setTimeout>
    const loop = () => {
      const wait = 500 + Math.random() * 700
      timer = setTimeout(() => {
        const up = Math.random() > 0.4
        const magnitude = 1 + Math.floor(Math.random() * 4)
        const change = up ? magnitude : -magnitude
        setDelta(change)
        setCount((c) => Math.min(260, Math.max(180, c + change)))
        loop()
      }, wait)
    }
    loop()
    return () => clearTimeout(timer)
  }, [phase])

  const isUp = delta >= 0
  // The number itself is tinted by the direction of the last move.
  const numberTone =
    phase === "live" ? (isUp ? "text-success" : "text-destructive") : "text-foreground"

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-success" />
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Aktyvūs signalai realiu laiku
        </span>
      </div>

      <div className="relative flex items-end justify-center">
        <motion.span
          key={count}
          initial={{ y: reduce ? 0 : isUp ? 6 : -6, scale: reduce ? 1 : 0.96 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className={`font-display text-[7rem] font-extrabold leading-none tracking-tighter tabular-nums transition-colors duration-300 sm:text-[9rem] ${numberTone}`}
        >
          {count}
        </motion.span>
        {phase === "live" && (
          <motion.span
            key={`${count}-${delta}`}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`mb-6 ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums ${
              isUp ? "text-success" : "text-destructive"
            }`}
          >
            {isUp ? "+" : ""}
            {delta}
          </motion.span>
        )}
      </div>

      <p className="mt-2 max-w-xs text-balance text-lg font-bold leading-snug">
        klaidų LT lažybų kontorose.
      </p>

      <Button size="lg" className="mt-8 w-full max-w-xs gap-2 font-semibold" onClick={onNext}>
        Žiūrėti klaidas
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>

      <div className="mt-8 flex items-center gap-2">
        {TEASER_BOOKS.map((b) => (
          <BookmakerLogo key={b} book={b} size={32} />
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Activity className="size-3.5 text-primary" aria-hidden="true" />
        Sekame tavo kontoras prieš Pinnacle.
      </p>
    </div>
  )
}

/* ---------- Screen 2: Live error card demo ---------- */

function ErrorCardScreen({ onNext, reduce }: { onNext: () => void; reduce: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <p className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
        Klaida #1 iš 200
      </p>

      <motion.div
        initial={{ opacity: 0, x: reduce ? 0 : 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BookmakerLogo book="7BET" size={32} />
            <span className="text-lg font-bold">
              7bet <span className="text-foreground">klaida!</span>
            </span>
          </div>
          <span className="rounded-md bg-success/15 px-2 py-1 text-sm font-bold text-success">
            +18%
          </span>
        </div>

        <p className="mt-3 text-sm font-medium">Shelton, B. · Sonego, L.</p>
        <p className="text-xs text-muted-foreground">
          1 setas · geimų suma: Daugiau 12.5 @ 2.83
        </p>

        <div className="my-4 h-px bg-border" />

        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Statant €100
        </p>
        <LeaderRow label="turėtų mokėti" value="€240" />
        <LeaderRow label="bet moka" value="€283" bold />

        <div className="my-3 h-px bg-primary/30" />

        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-success">
            Tau permoka
          </span>
          <span className="font-display text-2xl font-extrabold text-success">+€43</span>
        </div>
      </motion.div>

      <Button size="lg" className="mt-8 w-full gap-2 font-semibold" onClick={onNext}>
        Kas iš to?
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

function LeaderRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 translate-y-[-3px] border-b border-dotted border-border" />
      <span className={`font-mono tabular-nums ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>
        {value}
      </span>
    </div>
  )
}

/* ---------- Screen 3: Math explanation ---------- */

function MathScreen({ onNext, reduce }: { onNext: () => void; reduce: boolean }) {
  return (
    <div className="flex flex-col">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Kodėl tai veikia
      </p>
      <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight">
        Vienas: loterija.
        <br />
        <span className="text-primary">Šimtas: matematika.</span>
      </h2>
      <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
        Net +8% statymas su 3.00 koeficientu praloša 64% kartų. Bet pakartojus
        tai šimtus kartų — pelnas neišvengiamas.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Tavo bankas po kiekvieno statymo
          </span>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">
            pliusas
          </span>
        </div>
        <EquityCurve reduce={reduce} />
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>1 statymas</span>
          <span>100+ statymų</span>
        </div>
      </div>

      <p className="mt-6 text-center font-display text-lg font-bold leading-snug">
        Su persvara tu nebe lošėjas.
        <br />
        <span className="text-primary">Tu esi kazino.</span>
      </p>

      <Button size="lg" className="mt-6 w-full gap-2 font-semibold" onClick={onNext}>
        Žiūrėti tikrą rezultatą
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

/**
 * A clean upward equity curve with a soft area fill. The line wobbles
 * (wins and dips) but trends clearly up, which reads far better than bars.
 */
function EquityCurve({ reduce }: { reduce: boolean }) {
  const W = 280
  const H = 120
  // Realistic-looking jagged-but-rising equity points (normalised 0..1).
  const ys = [
    0.12, 0.18, 0.14, 0.26, 0.3, 0.24, 0.36, 0.42, 0.38, 0.5, 0.58, 0.52, 0.64,
    0.7, 0.66, 0.78, 0.86, 0.82, 0.92, 0.98,
  ]
  const stepX = W / (ys.length - 1)
  const points = ys.map((v, i) => ({
    x: i * stepX,
    y: H - 8 - v * (H - 20),
  }))
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ")
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-32 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* baseline */}
      <line x1="0" y1={H - 8} x2={W} y2={H - 8} stroke="var(--color-border)" strokeWidth="1" />

      <motion.path
        d={area}
        fill="url(#equityFill)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.6 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="var(--color-success)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduce ? 0 : 1.4, ease: "easeInOut" }}
      />
      <motion.circle
        cx={last.x}
        cy={last.y}
        r="4"
        fill="var(--color-success)"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: reduce ? 0 : 1.4, type: "spring", stiffness: 300 }}
      />
    </svg>
  )
}

/* ---------- Screen 4: Bankroll picker ---------- */

function BankrollScreen({
  value,
  onChange,
  onNext,
}: {
  value: number
  onChange: (v: number) => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        1 / 3 · Personalizuok
      </p>
      <h2 className="mt-3 flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
        <Wallet className="size-7 text-primary" aria-hidden="true" />
        Su kiek pradėtum?
      </h2>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {BANKROLLS.map((amount) => {
          const active = value === amount
          return (
            <motion.button
              key={amount}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(amount)}
              className={`rounded-xl border py-5 font-display text-xl font-bold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {eur0(amount)}
            </motion.button>
          )
        })}
      </div>

      <Button size="lg" className="mt-8 w-full gap-2 font-semibold" onClick={onNext}>
        Toliau
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

/* ---------- Screen 5: Time picker ---------- */

function TimeScreen({
  value,
  onChange,
  onNext,
}: {
  value: number
  onChange: (v: number) => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col">
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        2 / 3 · Personalizuok
      </p>
      <h2 className="mt-3 flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
        <Clock className="size-7 text-primary" aria-hidden="true" />
        Kiek skirtum per dieną?
      </h2>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {HOURS.map((h) => {
          const active = value === h.key
          return (
            <motion.button
              key={h.key}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(h.key)}
              className={`rounded-xl border py-5 font-semibold transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {h.label}
            </motion.button>
          )
        })}
      </div>

      <p className="mt-4 text-center text-sm italic text-muted-foreground">
        Dauguma skiria 1 val./d.
      </p>

      <Button size="lg" className="mt-8 w-full gap-2 font-semibold" onClick={onNext}>
        Matyti klaidas gyvai
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}

/* ---------- Backdrop ---------- */

function BackdropGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-24 bottom-0 size-72 rounded-full bg-success/10 blur-3xl" />
    </div>
  )
}
