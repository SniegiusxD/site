"use client"

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  BANKROLL,
  INITIAL_ACTIVE_BETS,
  SIGNALS,
} from "./mock-data"
import type { ActiveBet, BetStatus, Signal } from "./types"

interface PortfolioContextValue {
  signals: Signal[]
  activeBets: ActiveBet[]
  bankroll: number
  placeBet: (signal: Signal) => void
  settleBet: (id: string, status: Exclude<BetStatus, "laukia">) => void
  pendingCount: number
  settledTodayCount: number
  runningPnl: number
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null)

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [signals, setSignals] = useState<Signal[]>(SIGNALS)
  const [activeBets, setActiveBets] = useState<ActiveBet[]>(INITIAL_ACTIVE_BETS)

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
    setSignals((prev) => prev.filter((s) => s.id !== signal.id))
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
  const bankroll = BANKROLL + runningPnl

  const value = useMemo<PortfolioContextValue>(
    () => ({
      signals,
      activeBets,
      bankroll,
      placeBet,
      settleBet,
      pendingCount,
      settledTodayCount,
      runningPnl,
    }),
    [signals, activeBets, bankroll, pendingCount, settledTodayCount, runningPnl],
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
