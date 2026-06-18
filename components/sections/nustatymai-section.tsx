"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { eur } from "@/lib/format"
import { FLAT_STAKE } from "@/lib/mock-data"
import { usePortfolio } from "@/lib/portfolio-store"

const BOOKMAKERS = ["7BET", "TopSport", "Pinnacle"]

export function NustatymaiSection() {
  const { bankroll, baseBankroll, setBankroll } = usePortfolio()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [kelly, setKelly] = useState(false)
  const [lang, setLang] = useState<"LT" | "EN">("LT")
  const [books, setBooks] = useState<string[]>(["7BET", "TopSport"])
  const [edge, setEdge] = useState(2)

  // Local draft of the bankroll input, synced from the persisted value.
  const [bankrollDraft, setBankrollDraft] = useState<string>(String(baseBankroll))
  useEffect(() => {
    setBankrollDraft(String(baseBankroll))
  }, [baseBankroll])

  const commitBankroll = () => {
    const parsed = Number(bankrollDraft)
    if (Number.isFinite(parsed) && parsed > 0) {
      setBankroll(parsed)
    } else {
      setBankrollDraft(String(baseBankroll)) // reset invalid input
    }
  }

  const toggleBook = (b: string) =>
    setBooks((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    )

  return (
    <section aria-label="Nustatymai" className="flex flex-col gap-3">
      <Card title="Bankrolas">
        <div className="flex items-center justify-between gap-4 border-b border-border py-2">
          <label
            htmlFor="bankroll-input"
            className="text-sm text-muted-foreground"
          >
            Pradinis bankrolas
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">€</span>
            <input
              id="bankroll-input"
              type="number"
              min={1}
              step={10}
              inputMode="decimal"
              value={bankrollDraft}
              onChange={(e) => setBankrollDraft(e.target.value)}
              onBlur={commitBankroll}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur()
              }}
              className="w-28 rounded-lg border border-border bg-secondary px-2 py-1 text-right font-mono text-sm font-semibold tabular-nums focus:border-primary focus:outline-none"
              aria-label="Pradinis bankrolas eurais"
            />
          </div>
        </div>
        <p className="mb-2 mt-1 text-[12px] text-muted-foreground">
          Statymų dydžiai perskaičiuojami pagal tavo bankrolą.
        </p>
        <Row label="Dabartinis bankrolas" value={eur(bankroll)} />
        <Row label="Fiksuotas statymas" value={eur(FLAT_STAKE)} />
      </Card>

      <Card title="Vertės slenkstis">
        <p className="mb-3 text-[12px] text-muted-foreground">
          Rodyti tik signalus, kurių vertė viršija pasirinktą ribą.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={edge}
            onChange={(e) => setEdge(Number(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
            aria-label="Vertės slenkstis"
          />
          <span className="w-14 text-right font-mono text-sm font-semibold text-primary">
            {edge.toFixed(1)}%
          </span>
        </div>
      </Card>

      <Card title="Pageidavimai">
        <ToggleRow
          label="Automatinis atnaujinimas"
          hint="Atnaujinti duomenis kas 30 sek."
          checked={autoRefresh}
          onChange={setAutoRefresh}
        />
        <ToggleRow
          label="Pranešimai"
          hint="Įspėjimai apie naujas galimybes"
          checked={notifications}
          onChange={setNotifications}
        />
        <ToggleRow
          label="Kelly dydžio nustatymas"
          hint="Siūlyti statymą pagal Kelly kriterijų"
          checked={kelly}
          onChange={setKelly}
        />
      </Card>

      <Card title="Bukmekeriai">
        <p className="mb-3 text-[12px] text-muted-foreground">
          Įtraukti į linijų palyginimą.
        </p>
        <div className="flex flex-wrap gap-2">
          {BOOKMAKERS.map((b) => {
            const on = books.includes(b)
            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleBook(b)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {b}
              </button>
            )
          })}
        </div>
      </Card>

      <Card title="Kalba">
        <div className="flex gap-2">
          {(["LT", "EN"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                lang === l
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {l === "LT" ? "Lietuvių" : "English"}
            </button>
          ))}
        </div>
      </Card>
    </section>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums">
        {value}
      </span>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[12px] text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
