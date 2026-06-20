"use client"

import { Activity, ChevronDown, ChevronUp, TrendingUp } from "lucide-react"
import { useState } from "react"
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useClv, type ClvRow, type ClvStats } from "@/lib/use-clv"

type Tone = "pos" | "neg" | "neutral"

const CHART_AXIS = "oklch(0.7 0.01 270)"
const CHART_TOOLTIP = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--popover-foreground)",
}

const fmtClv = (v: number | null | undefined) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`

/** Short sport chip — avoids "BASKETBALL" overlapping match names in narrow rows. */
function sportLabel(sport: string): string {
  const map: Record<string, string> = {
    TENNIS: "Tenisas",
    BASKETBALL: "Krepš.",
    BASEBALL: "Beisbol.",
    FOOTBALL: "Futbol.",
    SOCCER: "Futbol.",
    ICE_HOCKEY: "Hok.",
    BOXING: "Boksas",
    MMA: "MMA",
    CRICKET: "Kriket.",
    VOLLEYBALL: "Tinkl.",
    HANDBALL: "Rank.",
  }
  return map[sport.toUpperCase()] ?? sport.slice(0, 8)
}

function formatMatchDate(startsAt: string | null | undefined): string {
  if (!startsAt) return ""
  try {
    const d = new Date(startsAt)
    if (Number.isNaN(d.getTime())) return ""
    return d.toLocaleDateString("lt-LT", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

function statusLabel(status: string): { text: string; title?: string } {
  if (status === "open") {
    return {
      text: "laukia",
      title: "Rungtynės dar neprasidėjo arba CLV dar nefiksuotas (fiksuojama iki 1 val. prieš startą)",
    }
  }
  if (status === "expired") {
    return {
      text: "be CLV",
      title:
        "Rungtynės baigėsi, bet Pinnacle uždarymo linijos nepavyko gauti (ne laimėta/pralaimėta)",
    }
  }
  return { text: status }
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: Tone
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

/**
 * CLV validation panel (#21). Reads the backend CLV tracker via /api/clv.
 * CLV = did our soft price beat where the sharp (Pinnacle) line closed? It is
 * the metric that proves edge is real, independent of win/loss variance.
 */
export function ClvPanel() {
  const { stats, isLoading, error } = useClv()
  const [visibleRecent, setVisibleRecent] = useState(RECENT_COLLAPSED)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold">CLV validacija</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">
          Linijos vertė vs uždarymo kursas
        </span>
      </div>

      {error ? (
        <p className="text-[12px] text-muted-foreground">
          CLV duomenys nepasiekiami ({error}).
        </p>
      ) : isLoading ? (
        <p className="text-[12px] text-muted-foreground">Kraunama…</p>
      ) : (
        <ClvBody
          stats={stats}
          visibleRecent={visibleRecent}
          setVisibleRecent={setVisibleRecent}
        />
      )}
    </div>
  )
}

const RECENT_COLLAPSED = 5
const PAGE_STEP = 10
const ROLLING_WINDOW = 5

/** Most CLV-rated sports first (tennis was hidden when list was A–Z + cap 3). */
function sportsByClvCount(stats: ClvStats) {
  return [...stats.by_sport].sort((a, b) => b.n - a.n)
}

/**
 * #30 CLV chart: one bar per closed bet (CLV %), oldest→newest, with a
 * {ROLLING_WINDOW}-bet rolling-mean line. Green = +CLV, red = −CLV.
 * v1 uses recent_closed from /api/clv (most-recent N; we reverse to chronological).
 */
function ClvChart({ closed }: { closed: ClvRow[] }) {
  // recent_closed is newest-first; chart reads best oldest→newest.
  const rows = [...closed]
    .filter((r) => r.clv_pct != null)
    .filter((r) => Math.abs(r.clv_pct as number) <= 1.0)
    .reverse()
  if (rows.length < 2) return null

  let runSum = 0
  const data = rows.map((r, i) => {
    const clv = (r.clv_pct as number) * 100
    runSum += clv
    const from = Math.max(0, i - (ROLLING_WINDOW - 1))
    const windowSlice = rows.slice(from, i + 1)
    const rolling =
      windowSlice.reduce((acc, x) => acc + (x.clv_pct as number) * 100, 0) /
      windowSlice.length
    return {
      idx: i + 1,
      clv: +clv.toFixed(2),
      rolling: +rolling.toFixed(2),
      label: r.game_signature,
    }
  })

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        CLV pagal statymą ({rows.length}) · slankusis vid. ({ROLLING_WINDOW})
      </span>
      <div className="rounded-lg border border-border bg-secondary/20 p-2">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
            <XAxis dataKey="idx" stroke={CHART_AXIS} fontSize={10} tickLine={false} axisLine={false} />
            <YAxis
              stroke={CHART_AXIS}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <ReferenceLine y={0} stroke={CHART_AXIS} strokeOpacity={0.4} />
            <Tooltip
              contentStyle={CHART_TOOLTIP}
              cursor={{ fill: "oklch(1 0 0 / 5%)" }}
              formatter={(value, name) => {
                if (value == null) return ["—", ""]
                const label =
                  name === "rolling" ? `Slankusis vid. (${ROLLING_WINDOW})` : "CLV"
                return [
                  `${Number(value) >= 0 ? "+" : ""}${value}%`,
                  label,
                ]
              }}
              labelFormatter={(_l, payload) =>
                payload?.[0]?.payload?.label ?? ""
              }
            />
            <Bar dataKey="clv" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.clv >= 0 ? "var(--chart-2)" : "var(--chart-4)"}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="rolling"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ClvBody({
  stats,
  visibleRecent,
  setVisibleRecent,
}: {
  stats: ClvStats
  visibleRecent: number
  setVisibleRecent: (v: number) => void
}) {
  if (stats.total === 0) {
    return (
      <p className="text-[12px] text-muted-foreground">
        Dar nėra stebimų statymų. Kiekvienas rastas signalas registruojamas
        automatiškai; CLV apskaičiuojamas, kai artėja rungtynių pradžia.
      </p>
    )
  }

  const meanTone: Tone =
    stats.mean_clv_pct == null
      ? "neutral"
      : stats.mean_clv_pct >= 0
        ? "pos"
        : "neg"
  const posTone: Tone =
    stats.pct_positive == null
      ? "neutral"
      : stats.pct_positive >= 50
        ? "pos"
        : "neg"

  const sports = sportsByClvCount(stats)
  const ratedRows = stats.recent_closed.length
    ? stats.recent_closed
    : stats.recent.filter((r) => r.status === "closed" && r.clv_pct != null)
  const recent = ratedRows.slice(0, visibleRecent)
  const hasMoreRecent = ratedRows.length > visibleRecent
  const showRecentScroll = visibleRecent > RECENT_COLLAPSED

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Kpi label="Stebima" value={`${stats.total}`} />
        <Kpi label="Įvertinta" value={`${stats.closed}`} />
        <Kpi label="Vidutinis CLV" value={fmtClv(stats.mean_clv_pct)} tone={meanTone} />
        <Kpi
          label="Teigiamas CLV %"
          value={stats.pct_positive == null ? "—" : `${stats.pct_positive.toFixed(0)}%`}
          tone={posTone}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        „Įvertinta“ = statymai su apskaičiuotu CLV. Sąrašas rodo <b>tik juos</b> (ne
        „laukia“ / „be CLV“). Kraunama po {PAGE_STEP} eilučių.
      </p>

      <ClvChart closed={ratedRows} />

      {stats.by_sport.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            CLV pagal sportą
          </span>
          {sports.map((s) => (
            <div
              key={s.sport}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-2.5 py-1.5 text-xs"
            >
              <span className="font-medium">
                {sportLabel(s.sport)}{" "}
                <span
                  className="text-muted-foreground"
                  title="Statymų su apskaičiuotu CLV skaičius"
                >
                  ({s.n} įvert.)
                </span>
              </span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  s.mean_clv_pct >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {fmtClv(s.mean_clv_pct)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <TrendingUp className="size-3" aria-hidden="true" />
          Paskutiniai su CLV ({stats.closed} įvertinta
          {ratedRows.length < stats.closed
            ? ` · rodoma ${ratedRows.length}`
            : ""}
          )
        </span>
        <div
          className={`flex flex-col gap-1 ${showRecentScroll ? "max-h-64 overflow-y-auto pr-1" : ""}`}
        >
          {recent.map((r, i) => {
            const dateStr = formatMatchDate(r.starts_at)
            return (
              <div
                key={`${r.game_signature}-${r.bet_type}-${i}`}
                className="rounded-md border border-border bg-secondary/20 px-2.5 py-2 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0 rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {sportLabel(r.sport)}
                  </span>
                  {dateStr && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {dateStr}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className="min-w-0 flex-1 truncate font-medium"
                    title={r.game_signature}
                  >
                    {r.game_signature}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {r.entry_soft_odds?.toFixed(2) ?? "—"}
                  </span>
                  {r.status === "closed" ? (
                    <span
                      className={`w-16 shrink-0 text-right font-mono font-semibold ${
                        (r.clv_pct ?? 0) >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {fmtClv(r.clv_pct)}
                    </span>
                  ) : (
                    (() => {
                      const st = statusLabel(r.status)
                      return (
                        <span
                          className="w-16 shrink-0 text-right text-[10px] text-muted-foreground"
                          title={st.title}
                        >
                          {st.text}
                        </span>
                      )
                    })()
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {(hasMoreRecent) && (
        <div className="flex flex-col gap-2">
          {hasMoreRecent && (
            <button
              type="button"
              onClick={() =>
                setVisibleRecent(
                  visibleRecent >= ratedRows.length
                    ? RECENT_COLLAPSED
                    : visibleRecent + PAGE_STEP,
                )
              }
              className="flex items-center justify-center gap-1 rounded-lg border border-border bg-secondary/30 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            >
              {visibleRecent >= ratedRows.length ? (
                <>
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                  Rodyti mažiau signalų
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                  Rodyti daugiau (+{PAGE_STEP}, {ratedRows.length - visibleRecent} liko)
                </>
              )}
            </button>
          )}
        </div>
      )}
    </>
  )
}
