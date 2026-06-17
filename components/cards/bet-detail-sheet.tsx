"use client"

import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, Clock, Scale, Sparkles, X } from "lucide-react"
import { useEffect } from "react"
import { BookmakerLogo, bookmakerLabel } from "@/components/shared/bookmaker-logo"
import { SportIcon } from "@/components/shared/sport-icon"
import { Button } from "@/components/ui/button"
import { eur, pct } from "@/lib/format"
import type { ActiveBet, Signal } from "@/lib/types"

/** Normalise a match string so "A vs B" and "A @ B" compare loosely. */
function matchKey(m: string) {
  return m
    .toLowerCase()
    .replace(/\s+(vs|@|—|-)\s+/g, "|")
    .replace(/[^a-z0-9|]/g, "")
}

export function BetDetailSheet({
  signal,
  existingBets,
  onClose,
  onPlace,
}: {
  signal: Signal | null
  existingBets: ActiveBet[]
  onClose: () => void
  onPlace: (s: Signal) => void
}) {
  // Close on Escape.
  useEffect(() => {
    if (!signal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [signal, onClose])

  const related =
    signal == null
      ? []
      : existingBets.filter((b) => matchKey(b.match) === matchKey(signal.match))

  // Derive a "fair" reference price from the detected edge.
  const fairOdds =
    signal != null ? signal.odds / (1 + signal.edgePercent / 100) : 0
  const toWin = signal ? signal.stake * (signal.odds - 1) : 0

  // Odds comparison bar widths (offered vs sharp reference).
  const sharp = signal?.sharpOdds ?? fairOdds
  const maxOdds = signal ? Math.max(signal.odds, sharp) : 1
  const offeredPct = signal ? (signal.odds / maxOdds) * 100 : 0
  const sharpPct = signal ? (sharp / maxOdds) * 100 : 0

  return (
    <AnimatePresence>
      {signal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Uždaryti"
            onClick={onClose}
            className="absolute inset-0 bg-background/85"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Statymo informacija: ${signal.match}`}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-2.5">
                <BookmakerLogo book={signal.bookmaker} size={36} />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold leading-tight">
                    {bookmakerLabel(signal.bookmaker)}
                  </span>
                  <SportIcon sport={signal.sport} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Clock className="size-3" aria-hidden="true" />
                  {signal.timeUntil}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Uždaryti"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Scroll body */}
            <div className="flex-1 overflow-y-auto p-4">
              <h2 className="text-pretty text-lg font-bold leading-snug">
                {signal.match}
              </h2>

              {/* Line + edge */}
              <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3.5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Pasirinkimas
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {signal.betDescription}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-extrabold text-success">
                    +{pct(signal.edgePercent)}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Tavo vertė
                  </p>
                </div>
              </div>

              {/* Fair vs offered */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    Fair koef.
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                    {fairOdds.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    {bookmakerLabel(signal.bookmaker)} siūlo
                  </p>
                  <p className="mt-1 font-mono text-xl font-bold tabular-nums text-primary">
                    {signal.odds.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Already-placed bets on this game */}
              {related.length > 0 && (
                <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3.5">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                      <AlertTriangle className="size-4" aria-hidden="true" />
                      Jau statei šiose rungtynėse
                    </p>
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-warning">
                      {related.length} statym{related.length === 1 ? "as" : "ai"}
                    </span>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2.5">
                    {related.map((b) => (
                      <li
                        key={b.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <BookmakerLogo book={b.bookmaker} size={22} />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium">
                              {b.betDescription}
                            </p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {bookmakerLabel(b.bookmaker)} · {b.odds.toFixed(2)} ·{" "}
                              {b.placedAt}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                          {eur(b.stake)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Odds comparison */}
              <div className="mt-4">
                <p className="mb-2.5 flex items-center gap-1.5 text-sm font-semibold">
                  <Scale className="size-4 text-success" aria-hidden="true" />
                  Koeficientų palyginimas
                </p>
                <div className="flex flex-col gap-2.5">
                  <OddsBar
                    label={bookmakerLabel(signal.bookmaker)}
                    odds={signal.odds}
                    widthPct={offeredPct}
                    tone="primary"
                    note="TU"
                  />
                  <OddsBar
                    label={signal.sharpBook ? bookmakerLabel(signal.sharpBook) : "Sharp"}
                    odds={sharp}
                    widthPct={sharpPct}
                    tone="muted"
                    note="SHARP"
                  />
                </div>
              </div>

              {/* Rationale */}
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/5 p-3">
                <Sparkles
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <p className="text-pretty text-[13px] leading-relaxed text-muted-foreground">
                  {signal.rationale}
                </p>
              </div>

              {/* Meta row */}
              <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[11px]">
                <Meta label="Limitas" value={eur(signal.stake * 125)} />
                <Meta label="Rinkos pers." value={`+${pct(signal.edgePercent)}`} tone="text-success" />
                <Meta label="Kelly" value={eur(signal.stake)} />
              </div>
            </div>

            {/* Sticky CTA */}
            <div className="border-t border-border p-4">
              <Button
                size="lg"
                className="w-full font-semibold"
                onClick={() => onPlace(signal)}
              >
                {related.length > 0 ? "Statyti dar kartą" : "Statyti"} {eur(signal.stake)} ·{" "}
                {signal.odds.toFixed(2)}
              </Button>
              {related.length > 0 && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Jau turi {related.length} statym{related.length === 1 ? "ą" : "us"}{" "}
                  šiose rungtynėse — statyk apgalvotai.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function OddsBar({
  label,
  odds,
  widthPct,
  tone,
  note,
}: {
  label: string
  odds: number
  widthPct: number
  tone: "primary" | "muted"
  note: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 truncate text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-secondary/50">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`h-full rounded-md ${
            tone === "primary" ? "bg-success" : "bg-muted-foreground/40"
          }`}
        />
      </div>
      <span
        className={`w-10 shrink-0 text-right font-mono text-sm font-semibold tabular-nums ${
          tone === "primary" ? "text-success" : "text-muted-foreground"
        }`}
      >
        {odds.toFixed(2)}
      </span>
      <span className="w-10 shrink-0 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
        {note}
      </span>
    </div>
  )
}

function Meta({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-2">
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-0.5 font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}
