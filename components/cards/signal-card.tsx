"use client"

import { AlertTriangle, Clock, Scale, Sparkles, TrendingUp } from "lucide-react"
import { BookmakerLogo, bookmakerLabel } from "@/components/shared/bookmaker-logo"
import { SportIcon } from "@/components/shared/sport-icon"
import { Button } from "@/components/ui/button"
import { eur, pct } from "@/lib/format"
import type { Signal } from "@/lib/types"

export function SignalCard({
  signal,
  onOpen,
  alreadyBet,
}: {
  signal: Signal
  onOpen: (s: Signal) => void
  /** true if the user already has a bet on this match */
  alreadyBet?: boolean
}) {
  const toWin = signal.stake * (signal.odds - 1)
  const edgeTone =
    signal.edgePercent >= 6
      ? "text-success"
      : signal.edgePercent >= 3
        ? "text-warning"
        : "text-muted-foreground"

  // value vs sharp reference line (aggregator signals)
  const valueVsSharp =
    signal.sharpOdds && signal.sharpOdds > 0
      ? ((signal.odds - signal.sharpOdds) / signal.sharpOdds) * 100
      : null

  return (
    <article
      onClick={() => onOpen(signal)}
      className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookmakerLogo book={signal.bookmaker} size={34} />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold leading-tight">
              {bookmakerLabel(signal.bookmaker)}
            </span>
            <SportIcon sport={signal.sport} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <Clock className="size-3" aria-hidden="true" />
            {signal.timeUntil}
          </span>
          {alreadyBet && (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
              <AlertTriangle className="size-3" aria-hidden="true" />
              Jau statei
            </span>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-pretty text-[15px] font-semibold leading-snug">
          {signal.match}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {signal.betDescription}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-secondary/40 p-2.5">
        <Stat label="Koeficientas" value={signal.odds.toFixed(2)} />
        <Stat
          label="Verte"
          value={`+${pct(signal.edgePercent)}`}
          valueClass={edgeTone}
        />
        <Stat label="Pasitik." value={`${signal.confidence}%`} />
      </div>

      {valueVsSharp !== null && signal.sharpOdds && (
        <div className="flex flex-col gap-2 rounded-lg border border-success/25 bg-success/5 p-2.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Scale className="size-3.5 text-success" aria-hidden="true" />
              Linijos palyginimas
            </span>
            <span className="font-mono font-semibold text-success">
              +{pct(valueVsSharp)} verte
            </span>
          </div>
          <div className="flex items-stretch gap-2 font-mono text-xs">
            <div className="flex flex-1 flex-col items-center gap-0.5 rounded-md bg-secondary/50 py-1.5">
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                {signal.sharpBook ? (
                  <BookmakerLogo book={signal.sharpBook} size={14} />
                ) : null}
                {signal.sharpBook ?? "Sharp"}
              </span>
              <span className="font-semibold tabular-nums text-muted-foreground">
                {signal.sharpOdds.toFixed(2)}
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center gap-0.5 rounded-md border border-success/30 bg-success/10 py-1.5">
              <span className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-success/80">
                <BookmakerLogo book={signal.bookmaker} size={14} />
                {signal.bookmaker}
              </span>
              <span className="font-semibold tabular-nums text-success">
                {signal.odds.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-lg bg-primary/5 p-2.5">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-pretty text-[12.5px] leading-relaxed text-muted-foreground">
          {signal.rationale}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>
          Statymas · <b className="text-foreground">{eur(signal.stake)}</b>
        </span>
        <span>
          Laimėtum · <b className="text-success">{eur(toWin)}</b>
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="size-3" aria-hidden="true" />
          Kelly {pct(signal.kellyPercent)}
        </span>
      </div>

      <Button
        onClick={(e) => {
          e.stopPropagation()
          onOpen(signal)
        }}
        className="mt-1 w-full font-semibold"
      >
        Statyti — {eur(signal.stake)}
      </Button>
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
