"use client"

import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { useMemo } from "react"
import { computeAnalytics, settledFromActive } from "@/lib/analytics"
import { eur, eur0 } from "@/lib/format"
import { usePortfolio } from "@/lib/portfolio-store"

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
      ? "text-success"
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
        <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
          {delta && tone === "pos" && (
            <ArrowUpRight className="size-3 text-success" aria-hidden="true" />
          )}
          {delta && tone === "neg" && (
            <ArrowDownRight className="size-3 text-danger" aria-hidden="true" />
          )}
          {delta ?? hint}
        </span>
      )}
    </div>
  )
}

export function KpiStrip() {
  const {
    bankroll,
    runningPnl,
    pendingCount,
    settledTodayCount,
    signals,
    activeBets,
  } = usePortfolio()

  // Real ROI + win rate from the user's own settled bets.
  const a = useMemo(
    () => computeAnalytics(settledFromActive(activeBets)),
    [activeBets],
  )

  // KPI bug fix: "Atviri signalai" must count only LIVE aggregator signals.
  // `signals` also contains ~10 demo signals from mock-data.ts (NBA/PLAYER/MLB
  // tabs), which made the card show 10 while Agregatorius showed 0.
  const liveSignalCount = useMemo(
    () => signals.filter((s) => s.category === "AGGREGATOR").length,
    [signals],
  )

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <KpiCard
        label="Bankrolas"
        value={eur(bankroll)}
        delta={`${runningPnl >= 0 ? "+" : ""}${eur0(runningPnl)} šiandien`}
        tone={runningPnl >= 0 ? "pos" : "neg"}
      />
      <KpiCard
        label="ROI"
        value={`${a.roi >= 0 ? "+" : ""}${a.roi}%`}
        delta={`${eur0(a.totalStaked)} pastatyta`}
        tone={a.roi >= 0 ? "pos" : "neg"}
      />
      <KpiCard
        label="Atviri signalai"
        value={String(liveSignalCount)}
        hint={`${pendingCount} statymai laukia`}
      />
      <KpiCard
        label="Sėkmės %"
        value={`${a.winRate}%`}
        hint={`${a.wins}L / ${a.losses}P`}
        tone={a.winRate >= 50 ? "pos" : "neutral"}
      />
      <KpiCard
        label="Apdorota"
        value={String(settledTodayCount)}
        hint="šiandien"
      />
    </div>
  )
}
