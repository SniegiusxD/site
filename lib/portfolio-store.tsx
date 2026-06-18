"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  BANKROLL,
  SIGNALS,
} from "./mock-data"
import { useSignals } from "./use-signals"
import type { ActiveBet, BetStatus, Signal } from "./types"

const BANKROLL_STORAGE_KEY = "userBankroll"

interface PortfolioContextValue {
  signals: Signal[]
  activeBets: ActiveBet[]
  bankroll: number
  baseBankroll: number
  setBankroll: (value: number) => void
  placeBet: (signal: Signal) => void
  settleBet: (id: string, status: Exclude<BetStatus, "laukia">) => void
  pendingCount: number
  settledTodayCount: number
  runningPnl: number
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null)

export function PortfolioProvider({ children }: { children: ReactNode }) {
  // User-configurable starting bankroll (TODO #11). Persisted to localStorage.
  // Initialised to the default constant so SSR and first client render match
  // (avoids hydration mismatch); the stored value is loaded in useEffect.
  const [baseBankroll, setBaseBankroll] = useState<number>(BANKROLL)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BANKROLL_STORAGE_KEY)
      if (stored != null) {
        const parsed = Number(stored)
        if (Number.isFinite(parsed) && parsed > 0) setBaseBankroll(parsed)
      }
    } catch {
      // localStorage unavailable (SSR/private mode) — keep the default.
    }
  }, [])

  const setBankroll = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return
    setBaseBankroll(value)
    try {
      window.localStorage.setItem(BANKROLL_STORAGE_KEY, String(value))
    } catch {
      // ignore persistence failures
    }
  }

  const { signals: liveSignals } = useSignals(baseBankroll)
  const mockOtherTabs = SIGNALS.filter((s) => s.category !== "AGGREGATOR")
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([])

  const signals = useMemo(
    () =>
      [...liveSignals, ...mockOtherTabs].filter((s) => !removedIds.has(s.id)),
    [liveSignals, mockOtherTabs, removedIds],
  )

  const placeBet = (signal: Signal) => {
    setActiveBets((prev) => {
      if (prev.some((b) => b.signalId === signal.id)) return prev
      const newBet: ActiveBet = {
        id: `act-${signal.id}-${Date.now()}`,
        signalId: signal.id,
        sport: signal.sport,
        match: signal.match,
        betDescription: signal.betDescription,
        bookmaker: signal.bookmaker,
        odds: signal.odds,
        stake: signal.stake,
        status: "laukia",
        placedAt: "Ką tik",
        profit: null,
      }
      return [newBet, ...prev]
    })
    setRemovedIds((prev) => new Set(prev).add(signal.id))
  }

  const settleBet = (id: string, status: Exclude<BetStatus, "laukia">) => {
    setActiveBets((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        let profit = 0
        if (status === "laimeta") profit = +(b.stake * (b.odds - 1)).toFixed(2)
        else if (status === "pralaimeta") profit = -b.stake
        else profit = 0
        return { ...b, status, profit }
      }),
    )
  }

  const pendingCount = activeBets.filter((b) => b.status === "laukia").length
  const settledTodayCount = activeBets.filter(
    (b) => b.status !== "laukia",
  ).length
  const runningPnl = activeBets.reduce((acc, b) => acc + (b.profit ?? 0), 0)
  const bankroll = baseBankroll + runningPnl

  const value = useMemo<PortfolioContextValue>(
    () => ({
      signals,
      activeBets,
      bankroll,
      baseBankroll,
      setBankroll,
      placeBet,
      settleBet,
      pendingCount,
      settledTodayCount,
      runningPnl,
    }),
    [signals, activeBets, bankroll, baseBankroll, pendingCount, settledTodayCount, runningPnl],
  )

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx)
    throw new Error("usePortfolio must be used within a PortfolioProvider")
  return ctx
}
