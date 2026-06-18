"use client"

import { useMemo } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BookmakerLogo, bookmakerLabel } from "@/components/shared/bookmaker-logo"
import { ClvPanel } from "@/components/sections/clv-panel"
import { computeAnalytics, settledFromActive } from "@/lib/analytics"
import { eur, pct } from "@/lib/format"
import { usePortfolio } from "@/lib/portfolio-store"

const AXIS = "oklch(0.7 0.01 270)"
const GRID = "oklch(1 0 0 / 8%)"

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--popover-foreground)",
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "pos" | "neg" | "neutral"
}) {
  const toneClass =
    tone === "pos"
      ? "text-success"
      : tone === "neg"
        ? "text-danger"
        : "text-foreground"
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={`font-mono text-lg font-semibold tabular-nums ${toneClass}`}>
        {value}
      </span>
    </div>
  )
}

export function AnalitikaSection() {
  const { activeBets } = usePortfolio()

  // Real numbers: every figure is derived from the user's own settled bets.
  const a = useMemo(
    () => computeAnalytics(settledFromActive(activeBets)),
    [activeBets],
  )

  const distColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ]

  return (
    <section aria-label="Analitika" className="flex flex-col gap-3">
      {/* CLV validation loop (#21) — proves whether surfaced edges are real */}
      <ClvPanel />

      {/* Real derived KPIs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Kpi
          label="Bankrolas"
          value={eur(a.currentBankroll)}
          tone={a.netPnl >= 0 ? "pos" : "neg"}
        />
        <Kpi
          label="Grynas P/N"
          value={`${a.netPnl >= 0 ? "+" : ""}${eur(a.netPnl)}`}
          tone={a.netPnl >= 0 ? "pos" : "neg"}
        />
        <Kpi
          label="ROI"
          value={`${a.roi >= 0 ? "+" : ""}${pct(a.roi)}`}
          tone={a.roi >= 0 ? "pos" : "neg"}
        />
        <Kpi label="Sėkmės %" value={`${a.winRate}%`} tone="pos" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Kpi label="Statymai" value={`${a.totalBets}`} />
        <Kpi label="L / P" value={`${a.wins} / ${a.losses}`} />
        <Kpi label="Pastatyta" value={eur(a.totalStaked)} />
        <Kpi label="Vid. koef." value={a.avgOdds.toFixed(2)} />
      </div>

      <ChartCard
        title="Bankrolo kreivė"
        subtitle={`Kaupiamasis rezultatas · ${a.totalBets} apdoroti statymai`}
      >
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart
            data={a.equityCurve}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="day"
              stroke={AXIS}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke={AXIS}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 40", "dataMax + 40"]}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v) => [eur(Number(v)), "Bankrolas"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-2)"
              strokeWidth={2.5}
              fill="url(#eq)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-3 sm:grid-cols-2">
        <ChartCard title="Sėkmės % pagal sportą">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={a.winRateBySport}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="sport"
                stroke={AXIS}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                stroke={AXIS}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                cursor={{ fill: "oklch(1 0 0 / 5%)" }}
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v}%`, "Sėkmė"]}
              />
              <Bar dataKey="winRate" radius={[6, 6, 0, 0]}>
                {a.winRateBySport.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.winRate >= 50 ? "var(--chart-2)" : "var(--chart-4)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Statymų pasiskirstymas">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              layout="vertical"
              data={a.distribution}
              margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
            >
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis
                type="number"
                stroke={AXIS}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="sport"
                stroke={AXIS}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={68}
              />
              <Tooltip
                cursor={{ fill: "oklch(1 0 0 / 5%)" }}
                contentStyle={tooltipStyle}
                formatter={(v) => [`${v} statymai`, "Kiekis"]}
              />
              <Bar dataKey="bets" radius={[0, 6, 6, 0]}>
                {a.distribution.map((_, i) => (
                  <Cell key={i} fill={distColors[i % distColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Pelnas pagal kontorą"
        subtitle="Grynas P/N kiekvienoje lažybų kontoroje"
      >
        <ul className="flex flex-col gap-2">
          {a.pnlByBookmaker.map((b) => (
            <li
              key={b.book}
              className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5"
            >
              <BookmakerLogo book={b.book} size={28} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{bookmakerLabel(b.book)}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {b.bets} statym{b.bets === 1 ? "as" : "ai"}
                </p>
              </div>
              <span
                className={`font-mono text-sm font-semibold tabular-nums ${
                  b.net > 0
                    ? "text-success"
                    : b.net < 0
                      ? "text-danger"
                      : "text-muted-foreground"
                }`}
              >
                {b.net > 0 ? "+" : ""}
                {eur(b.net)}
              </span>
            </li>
          ))}
        </ul>
      </ChartCard>
    </section>
  )
}
