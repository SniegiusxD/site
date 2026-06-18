"use client"

import {
  Activity,
  Clock,
  RefreshCw,
  Scale,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { useState } from "react"

/**
 * Isolated, throwaway preview of an emerald accent theme.
 * This page does NOT touch globals.css or any live component.
 * It scopes its own CSS variables to a wrapper so you can compare
 * the current blue accent against the proposed emerald one.
 *
 * Safe to delete at any time — nothing else imports it.
 */

const THEMES = {
  blue: {
    primary: "oklch(0.62 0.17 250)",
    ring: "oklch(0.62 0.17 250)",
    success: "oklch(0.7 0.16 152)",
  },
  emerald: {
    primary: "oklch(0.68 0.15 162)",
    ring: "oklch(0.68 0.15 162)",
    // shift "success" slightly more yellow-green so it stays
    // distinct from the new emerald primary
    success: "oklch(0.78 0.17 142)",
  },
} as const

type ThemeKey = keyof typeof THEMES

export default function PreviewPage() {
  const [theme, setTheme] = useState<ThemeKey>("emerald")
  const t = THEMES[theme]

  return (
    <div
      style={
        {
          "--primary": t.primary,
          "--ring": t.ring,
          "--success": t.success,
        } as React.CSSProperties
      }
      className="min-h-svh bg-background text-foreground"
    >
      {/* preview controls */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Theme preview</p>
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
              <ThemeToggle
                active={theme === "blue"}
                onClick={() => setTheme("blue")}
                label="Blue (current)"
              />
              <ThemeToggle
                active={theme === "emerald"}
                onClick={() => setTheme("emerald")}
                label="Emerald (proposed)"
              />
            </div>
          </div>
          <p className="text-pretty text-[12px] leading-relaxed text-muted-foreground">
            Preview only — this route is isolated and does not change the live
            theme or any component.
          </p>
        </div>
      </div>

      {/* mock top bar */}
      <header className="border-b border-border bg-background/85">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="size-4.5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight">Signalai</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                SportsBetting AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--success)]" />
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Tiesiogiai
            </span>
            <RefreshCw
              className="size-3 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5">
        {/* mock KPI strip */}
        <section className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <KpiCard label="Bankrolas" value="€1 240" delta="+€84 šiandien" tone="pos" />
          <KpiCard label="ROI" value="+12.4%" delta="€680 pastatyta" tone="pos" />
          <KpiCard label="Atviri signalai" value="6" hint="3 laukia" />
          <KpiCard label="Sėkmės %" value="58%" hint="14L / 10P" tone="pos" />
        </section>

        {/* mock signal cards */}
        <section className="flex flex-col gap-3">
          <MockSignalCard />
          <MockSignalCard alt />
        </section>
      </main>
    </div>
  )
}

function ThemeToggle({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  )
}

function KpiCard({
  label,
  value,
  delta,
  tone = "neutral",
  hint,
}: {
  label: string
  value: string
  delta?: string
  tone?: "pos" | "neg" | "neutral"
  hint?: string
}) {
  const toneClass =
    tone === "pos"
      ? "text-[var(--success)]"
      : tone === "neg"
        ? "text-danger"
        : "text-foreground"
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-1 rounded-xl border border-border bg-card p-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={`font-mono text-lg font-semibold tabular-nums ${toneClass}`}>
        {value}
      </span>
      {(delta || hint) && (
        <span className="font-mono text-[11px] text-muted-foreground">
          {delta ?? hint}
        </span>
      )}
    </div>
  )
}

function MockSignalCard({ alt = false }: { alt?: boolean }) {
  const odds = alt ? 2.1 : 1.85
  const sharpOdds = alt ? 1.92 : 1.7
  const stake = alt ? 40 : 25
  const edge = alt ? 7.2 : 4.1
  const valueVsSharp = ((odds - sharpOdds) / sharpOdds) * 100
  const toWin = stake * (odds - 1)

  return (
    <article className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex size-[34px] items-center justify-center rounded-lg bg-secondary text-[11px] font-bold">
            BET
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold leading-tight">Betsson</span>
            <span className="text-[11px] text-muted-foreground">Futbolas</span>
          </div>
        </div>
        <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
          <Clock className="size-3" aria-hidden="true" />
          {alt ? "2val 10min" : "45min"}
        </span>
      </div>

      <div>
        <h3 className="text-pretty text-[15px] font-semibold leading-snug">
          {alt ? "Bayern München – Dortmund" : "Arsenal – Chelsea"}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {alt ? "Daugiau nei 2.5 įvarčių" : "Arsenal laimi (1X2)"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-secondary/40 p-2.5">
        <Stat label="Koeficientas" value={odds.toFixed(2)} />
        <Stat
          label="Verte"
          value={`+${edge.toFixed(1)}%`}
          valueClass="text-[var(--success)]"
        />
        <Stat label="Pasitik." value={alt ? "72%" : "65%"} />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-[var(--success)]/25 bg-[var(--success)]/5 p-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
            <Scale className="size-3.5 text-[var(--success)]" aria-hidden="true" />
            Linijos palyginimas
          </span>
          <span className="font-mono font-semibold text-[var(--success)]">
            +{valueVsSharp.toFixed(1)}% verte
          </span>
        </div>
        <div className="flex items-stretch gap-2 font-mono text-xs">
          <div className="flex flex-1 flex-col items-center gap-0.5 rounded-md bg-secondary/50 py-1.5">
            <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
              Pinnacle
            </span>
            <span className="font-semibold tabular-nums text-muted-foreground">
              {sharpOdds.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center gap-0.5 rounded-md border border-[var(--success)]/30 bg-[var(--success)]/10 py-1.5">
            <span className="text-[9px] uppercase tracking-wide text-[var(--success)]/80">
              Betsson
            </span>
            <span className="font-semibold tabular-nums text-[var(--success)]">
              {odds.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-2.5">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-pretty text-[12.5px] leading-relaxed text-muted-foreground">
          Modelis rado vertę lyginant su sharp linija. Koeficientas viršija
          tikrąją tikimybę.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>
          Statymas · <b className="text-foreground">€{stake}</b>
        </span>
        <span>
          Laimėtum · <b className="text-[var(--success)]">€{toWin.toFixed(2)}</b>
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="size-3" aria-hidden="true" />
          Kelly {alt ? "3.1%" : "2.0%"}
        </span>
      </div>

      <button
        type="button"
        className="mt-1 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
      >
        Statyti — €{stake}
      </button>
    </article>
  )
}

function Stat({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={`font-mono text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
      </span>
    </div>
  )
}
