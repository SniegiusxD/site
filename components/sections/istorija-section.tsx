"use client"

import { Download, History as HistoryIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { SportIcon } from "@/components/shared/sport-icon"
import { Button } from "@/components/ui/button"
import { eur, STATUS_CLASS, STATUS_LABEL } from "@/lib/format"
import { usePortfolio } from "@/lib/portfolio-store"

type Filter = "all" | "laimeta" | "pralaimeta"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Visi" },
  { key: "laimeta", label: "Laimėti" },
  { key: "pralaimeta", label: "Pralaimėti" },
]

export function IstorijaSection() {
  const { activeBets } = usePortfolio()
  const [filter, setFilter] = useState<Filter>("all")

  // Real history: only the user's own settled bets, newest first.
  const settled = useMemo(
    () => activeBets.filter((b) => b.status !== "laukia"),
    [activeBets],
  )

  const rows = useMemo(
    () =>
      filter === "all" ? settled : settled.filter((h) => h.status === filter),
    [filter, settled],
  )

  const wins = settled.filter((h) => h.status === "laimeta").length
  const losses = settled.filter((h) => h.status === "pralaimeta").length
  const totalPnl = settled.reduce((a, h) => a + (h.profit ?? 0), 0)
  const winRate =
    wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0

  const exportCsv = () => {
    const header = "Sportas,Rungtynės,Statymas,Knyga,Koef,Suma,Statusas,P/N"
    const lines = settled.map((h) =>
      [
        h.sport,
        `"${h.match}"`,
        `"${h.betDescription}"`,
        h.bookmaker,
        h.odds,
        h.stake,
        STATUS_LABEL[h.status],
        h.profit ?? 0,
      ].join(","),
    )
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "statymu-istorija.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section aria-label="Istorija">
      <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-border bg-card p-3">
        <Summary label="Sėkmės %" value={`${winRate}%`} tone="pos" />
        <Summary label="L / P" value={`${wins} / ${losses}`} />
        <Summary
          label="Bendras P/N"
          value={`${totalPnl >= 0 ? "+" : ""}${eur(totalPnl)}`}
          tone={totalPnl >= 0 ? "pos" : "neg"}
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={exportCsv}
          disabled={settled.length === 0}
        >
          <Download className="size-4" aria-hidden="true" />
          CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <HistoryIcon
            className="size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Dar nėra apdorotų statymų. Rezultatai atsiras automatiškai, kai
            pasibaigs rungtynės.
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <SportIcon sport={h.sport} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{h.match}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  {h.betDescription} · {h.bookmaker} · {h.placedAt}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[h.status]}`}
                >
                  {STATUS_LABEL[h.status]}
                </span>
                <span
                  className={`font-mono text-sm font-semibold tabular-nums ${
                    (h.profit ?? 0) > 0
                      ? "text-success"
                      : (h.profit ?? 0) < 0
                        ? "text-danger"
                        : "text-muted-foreground"
                  }`}
                >
                  {(h.profit ?? 0) > 0 ? "+" : ""}
                  {eur(h.profit ?? 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function Summary({
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
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={`font-mono text-base font-semibold tabular-nums ${toneClass}`}>
        {value}
      </span>
    </div>
  )
}
