"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { CheckCircle2, Hammer, Inbox } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { SignalCard } from "@/components/cards/signal-card"
import { BetDetailSheet } from "@/components/cards/bet-detail-sheet"
import { BookmakerLogo, bookmakerLabel } from "@/components/shared/bookmaker-logo"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SIGNAL_TABS } from "@/lib/mock-data"
import { usePortfolio } from "@/lib/portfolio-store"
import type { Bookmaker, Signal, SportKey } from "@/lib/types"

const BOOK_FILTERS: ("ALL" | Bookmaker)[] = [
  "ALL",
  "7BET",
  "TopSport",
]

/** Loosely normalise a match string so "A vs B" / "A @ B" compare. */
function matchKey(m: string) {
  return m
    .toLowerCase()
    .replace(/\s+(vs|@|—|-)\s+/g, "|")
    .replace(/[^a-z0-9|]/g, "")
}

export function SignalaiSection() {
  const { signals, activeBets, placeBet } = usePortfolio()
  const reduce = useReducedMotion()
  const [tab, setTab] = useState<SportKey>("AGGREGATOR")
  const [book, setBook] = useState<"ALL" | Bookmaker>("ALL")
  const [toast, setToast] = useState<string | null>(null)
  const [selected, setSelected] = useState<Signal | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  const inCategory = signals.filter((s) => s.category === tab)
  const filtered = useMemo(
    () =>
      book === "ALL"
        ? inCategory
        : inCategory.filter((s) => s.bookmaker === book),
    [inCategory, book],
  )

  // Set of match keys the user already has active bets on.
  const betMatchKeys = useMemo(
    () => new Set(activeBets.map((b) => matchKey(b.match))),
    [activeBets],
  )

  const isAggregator = tab === "AGGREGATOR"

  const handlePlace = (signalId: string) => {
    const signal = signals.find((s) => s.id === signalId)
    if (!signal) return
    // Close the sheet + confirm immediately so the tap feels instant…
    setSelected(null)
    setToast("Pridėta · stebima")
    // …then mutate the list a beat later, after the sheet's exit is underway,
    // so the modal animation and the grid reflow don't fight on the same frame.
    window.setTimeout(() => placeBet(signal), 240)
  }

  return (
    <section aria-label="Signalai">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as SportKey)
          setBook("ALL")
        }}
      >
        <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SIGNAL_TABS.map((t) => {
            const count = signals.filter((s) => s.category === t.key).length
            const live = t.key === "AGGREGATOR"
            return (
              <TabsTrigger
                key={t.key}
                value={t.key}
                className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="flex items-center gap-1.5">
                  {t.label}
                  <span className="font-mono text-[10px] opacity-70">
                    {live ? count : "·"}
                  </span>
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>
      </Tabs>

      {isAggregator ? (
        <>
          {/* Bookmaker filter row */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {BOOK_FILTERS.map((b) => {
              const active = book === b
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBook(b)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {b !== "ALL" && <BookmakerLogo book={b} size={16} />}
                  {b === "ALL" ? "Visos" : bookmakerLabel(b)}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Vertės galimybės</h2>
            <span className="font-mono text-[11px] text-muted-foreground">
              {filtered.length} signal{filtered.length === 1 ? "as" : "ai"}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
              <Inbox
                className="size-7 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                Šioje kontoroje šiuo metu nėra signalų.
              </p>
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filtered.map((s, i) => (
                  <motion.div
                    key={s.id}
                    layout
                    initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      scale: reduce ? 1 : 0.95,
                      transition: { duration: 0.18, ease: "easeOut" },
                    }}
                    transition={{
                      layout: { duration: 0.2, ease: "easeOut" },
                      duration: 0.25,
                      delay: reduce ? 0 : Math.min(i * 0.025, 0.15),
                      ease: "easeOut",
                    }}
                  >
                    <SignalCard
                      signal={s}
                      alreadyBet={betMatchKeys.has(matchKey(s.match))}
                      onOpen={(sig) => setSelected(sig)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      ) : (
        <ComingSoon
          label={SIGNAL_TABS.find((t) => t.key === tab)?.label ?? ""}
        />
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-success/30 bg-card px-4 py-2.5 text-sm shadow-lg"
          >
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <BetDetailSheet
        signal={selected}
        existingBets={activeBets}
        onClose={() => setSelected(null)}
        onPlace={(sig) => handlePlace(sig.id)}
      />
    </section>
  )
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Hammer className="size-6 text-primary" aria-hidden="true" />
      </span>
      <div>
        <p className="text-base font-semibold">{label} · Kuriama</p>
        <p className="mt-1 text-pretty text-sm text-muted-foreground">
          Šis signalų modelis dar ruošiamas. Kol kas naudokis
          {" "}
          <span className="font-medium text-foreground">Agregatoriumi</span> —
          jis jau veikia.
        </p>
      </div>
    </div>
  )
}
