"use client"

import { Activity, TrendingUp } from "lucide-react"
import { useClv, type ClvStats } from "@/lib/use-clv"

const fmtClv = (v: number | null | undefined) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`

type Tone = "pos" | "neg" | "neutral"

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
        <ClvBody stats={stats} />
      )}
    </div>
  )
}

function ClvBody({ stats }: { stats: ClvStats }) {
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

      {stats.by_sport.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            CLV pagal sportą
          </span>
          {stats.by_sport.map((s) => (
            <div
              key={s.sport}
              className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-2.5 py-1.5 text-xs"
            >
              <span className="font-medium">
                {s.sport} <span className="text-muted-foreground">({s.n})</span>
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
          Paskutiniai statymai
        </span>
        <div className="flex flex-col gap-1">
          {stats.recent.slice(0, 20).map((r, i) => (
            <div
              key={`${r.game_signature}-${r.bet_type}-${i}`}
              className="flex items-center gap-2 rounded-md border border-border bg-secondary/20 px-2 py-1.5 text-[11px]"
            >
              <span className="w-14 shrink-0 text-muted-foreground">{r.sport}</span>
              <span className="min-w-0 flex-1 truncate" title={r.game_signature}>
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
                <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                  {r.status === "open" ? "laukia" : "baigėsi"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
