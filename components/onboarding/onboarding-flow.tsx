"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Check, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { BookmakerLogo, bookmakerLabel } from "@/components/shared/bookmaker-logo"
import { Button } from "@/components/ui/button"
import type { Bookmaker } from "@/lib/types"

const BOOKMAKERS: Bookmaker[] = ["7BET", "TopSport", "Pinnacle"]

type Props = {
  onComplete: (config: { books: Bookmaker[] }) => void
}

export function OnboardingFlow({ onComplete }: Props) {
  const reduce = useReducedMotion()
  const [books, setBooks] = useState<Bookmaker[]>(["7BET", "TopSport"])

  const toggleBook = (b: Bookmaker) =>
    setBooks((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    )

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background text-foreground">
      <BackdropGlow />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
        <motion.section
          initial={{ opacity: 0, y: reduce ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex flex-col"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            3 / 3 · Personalizuok
          </p>
          <h2 className="mt-3 flex items-center gap-2 font-display text-3xl font-extrabold tracking-tight">
            <ShieldCheck className="size-7 text-primary" aria-hidden="true" />
            Pasirink kontoras
          </h2>
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
            Rodysime signalus tik iš tavo pasirinktų bukmekerių.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3">
            {BOOKMAKERS.map((b, i) => {
              const active = books.includes(b)
              return (
                <motion.button
                  key={b}
                  type="button"
                  onClick={() => toggleBook(b)}
                  initial={{ opacity: 0, y: reduce ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-muted-foreground/30"
                  }`}
                >
                  <BookmakerLogo book={b} size={40} />
                  <span className="text-sm font-semibold">{bookmakerLabel(b)}</span>
                  {active && (
                    <span className="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full bg-primary">
                      <Check className="size-3 text-primary-foreground" aria-hidden="true" />
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>

          <Button
            size="lg"
            className="mt-8 w-full gap-2 font-semibold"
            disabled={books.length === 0}
            onClick={() => onComplete({ books })}
          >
            Atidaryk signalus ({books.length})
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </motion.section>
      </div>
    </div>
  )
}

function BackdropGlow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-24 top-1/3 size-72 rounded-full bg-success/10 blur-3xl" />
    </div>
  )
}
