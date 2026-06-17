"use client"

import { Wallet } from "lucide-react"
import { ActiveBetCard } from "@/components/cards/active-bet-card"
import { eur } from "@/lib/format"
import { usePortfolio } from "@/lib/portfolio-store"

export function AktyvusSection() {
  const { activeBets, runningPnl, pendingCount } = usePortfolio()

  const pending = activeBets.filter((b) => b.status === "laukia")
  const settled = activeBets.filter((b) => b.status !== "laukia")
  const staked = pending.reduce((a, b) => a + b.stake, 0)

  return (
    <section aria-label="Aktyvūs statymai">
      <div className="grid grid-cols-3 gap-2.5 rounded-xl border border-border bg-card p-3">
        <Summary label="Laukia" value={String(pendingCount)} />
        <Summary label="Rizikuojama" value={eur(staked)} />
        <Summary
          label="P/N šiandien"
          value={`${runningPnl >= 0 ? "+" : ""}${eur(runningPnl)}`}
          tone={runningPnl >= 0 ? "pos" : "neg"}
        />
      </div>

      {activeBets.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <Wallet className="size-7 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Dar nėra pastatytų statymų. Pasirinkite signalą skiltyje Signalai.
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <Group title="Laukiama rezultato" count={pending.length}>
              {pending.map((b) => (
                <ActiveBetCard key={b.id} bet={b} />
              ))}
            </Group>
          )}
          {settled.length > 0 && (
            <Group title="Apdorota" count={settled.length}>
              {settled.map((b) => (
                <ActiveBetCard key={b.id} bet={b} />
              ))}
            </Group>
          )}
        </>
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

function Group({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="font-mono text-[11px] text-muted-foreground">
          {count}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  )
}
