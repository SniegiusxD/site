"use client"

import { Activity, ChevronDown, ChevronUp, TrendingUp } from "lucide-react"
import { useState } from "react"
import { useClv, type ClvStats } from "@/lib/use-clv"

type Tone = "pos" | "neg" | "neutral"

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
  const [visibleSports, setVisibleSports] = useState(SPORT_COLLAPSED)

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
          visibleSports={visibleSports}
          setVisibleSports={setVisibleSports}
        />
      )}
    </div>
  )
}

const RECENT_COLLAPSED = 5
const SPORT_COLLAPSED = 3
const PAGE_STEP = 10

function ClvBody({
  stats,
  visibleRecent,
  setVisibleRecent,
  visibleSports,
  setVisibleSports,
}: {
  stats: ClvStats
  visibleRecent: number
  setVisibleRecent: (v: number) => void
  visibleSports: number
  setVisibleSports: (v: number) => void
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

  const sports = stats.by_sport.slice(0, visibleSports)
  const ratedRows = stats.recent_closed.length
    ? stats.recent_closed
    : stats.recent.filter((r) => r.status === "closed" && r.clv_pct != null)
  const recent = ratedRows.slice(0, visibleRecent)
  const hasMoreSports = stats.by_sport.length > visibleSports
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

      {(hasMoreSports || hasMoreRecent) && (
        <div className="flex flex-col gap-2">
          {hasMoreSports && (
            <button
              type="button"
              onClick={() =>
                setVisibleSports(
                  visibleSports >= stats.by_sport.length
                    ? SPORT_COLLAPSED
                    : visibleSports + PAGE_STEP,
                )
              }
              className="flex items-center justify-center gap-1 rounded-lg border border-border bg-secondary/30 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
            >
              {visibleSports >= stats.by_sport.length ? (
                <>
                  <ChevronUp className="size-3.5" aria-hidden="true" />
                  Mažiau sportų
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" aria-hidden="true" />
                  Daugiau sportų ({stats.by_sport.length - visibleSports} liko)
                </>
              )}
            </button>
          )}
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
