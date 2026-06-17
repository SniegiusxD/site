"use client"

import { Check, X } from "lucide-react"
import { SportIcon } from "@/components/shared/sport-icon"
import { Button } from "@/components/ui/button"
import { eur, STATUS_CLASS, STATUS_LABEL } from "@/lib/format"
import { usePortfolio } from "@/lib/portfolio-store"
import type { ActiveBet } from "@/lib/types"

export function ActiveBetCard({ bet }: { bet: ActiveBet }) {
  const { settleBet } = usePortfolio()
  const pending = bet.status === "laukia"
  const toWin = bet.stake * (bet.odds - 1)

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <SportIcon sport={bet.sport} />
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASS[bet.status]}`}
        >
          {STATUS_LABEL[bet.status]}
        </span>
      </div>

      <div>
        <h3 className="text-pretty text-[15px] font-semibold leading-snug">
          {bet.match}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {bet.betDescription}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>
          {bet.bookmaker} · koef.{" "}
          <b className="text-foreground">{bet.odds.toFixed(2)}</b>
        </span>
        <span>
          Statymas · <b className="text-foreground">{eur(bet.stake)}</b>
        </span>
        <span>{bet.placedAt}</span>
      </div>

      {pending ? (
        <div className="flex items-center gap-2">
          <span className="mr-auto font-mono text-[11px] text-muted-foreground">
            Galimas laimėjimas{" "}
            <b className="text-success">{eur(toWin)}</b>
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-success/40 text-success hover:bg-success/10 hover:text-success"
            onClick={() => settleBet(bet.id, "laimeta")}
          >
            <Check className="size-4" aria-hidden="true" />
            Laimėta
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => settleBet(bet.id, "pralaimeta")}
          >
            <X className="size-4" aria-hidden="true" />
            Pralaimėta
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between border-t border-border pt-2.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Rezultatas
          </span>
          <span
            className={`font-mono text-sm font-semibold ${
              (bet.profit ?? 0) > 0
                ? "text-success"
                : (bet.profit ?? 0) < 0
                  ? "text-danger"
                  : "text-muted-foreground"
            }`}
          >
            {(bet.profit ?? 0) > 0 ? "+" : ""}
            {eur(bet.profit ?? 0)}
          </span>
        </div>
      )}
    </article>
  )
}
