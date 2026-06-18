"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { BANKROLL, SIGNALS } from "./mock-data"
import { useSignals } from "./use-signals"
import { authClient } from "./auth-client"
import type { ActiveBet, BetStatus, Signal } from "./types"

const BANKROLL_STORAGE_KEY = "userBankroll"
const LOCAL_BETS_KEY = "localBets"
const REMOVED_SIGNALS_KEY = "removedSignalIds"

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
  betsSynced: boolean
  isLoggedIn: boolean
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null)

function betHideKey(b: Pick<ActiveBet, "match" | "betDescription" | "bookmaker">) {
  return `${b.match}|${b.betDescription}|${b.bookmaker}`
}

function signalHideKey(s: Pick<Signal, "match" | "betDescription" | "bookmaker">) {
  return `${s.match}|${s.betDescription}|${s.bookmaker}`
}

function loadStoredRemovedIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(REMOVED_SIGNALS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as string[]
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

function persistRemovedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(REMOVED_SIGNALS_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

function addLocalBetFromSignal(prev: ActiveBet[], signal: Signal): ActiveBet[] {
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
    marketType: signal.marketType,
    pickName: signal.pickName,
    startsAt: signal.startsAt,
  }
  return [newBet, ...prev]
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession()
  const isLoggedIn = !!session?.user

  const [baseBankroll, setBaseBankrollState] = useState<number>(BANKROLL)
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([])
  const [betsSynced, setBetsSynced] = useState(false)
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BANKROLL_STORAGE_KEY)
      if (stored != null) {
        const parsed = Number(stored)
        if (Number.isFinite(parsed) && parsed > 0) setBaseBankrollState(parsed)
      }
    } catch {
      // ignore
    }
    setRemovedIds(loadStoredRemovedIds())
  }, [])

  const setBankroll = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return
    setBaseBankrollState(value)
    try {
      window.localStorage.setItem(BANKROLL_STORAGE_KEY, String(value))
    } catch {
      // ignore
    }
  }

  const { signals: liveSignals } = useSignals(baseBankroll)
  const mockOtherTabs = SIGNALS.filter((s) => s.category !== "AGGREGATOR")

  const hiddenBetKeys = useMemo(
    () =>
      new Set(
        activeBets.filter((b) => b.status === "laukia").map(betHideKey),
      ),
    [activeBets],
  )

  const signals = useMemo(
    () =>
      [...liveSignals, ...mockOtherTabs].filter(
        (s) =>
          !removedIds.has(s.id) && !hiddenBetKeys.has(signalHideKey(s)),
      ),
    [liveSignals, mockOtherTabs, removedIds, hiddenBetKeys],
  )

  const persistLocal = useCallback((bets: ActiveBet[]) => {
    try {
      window.localStorage.setItem(LOCAL_BETS_KEY, JSON.stringify(bets))
    } catch {
      // ignore
    }
  }, [])

  const syncRemovedFromBets = useCallback((bets: ActiveBet[]) => {
    setRemovedIds((prev) => {
      const next = new Set(prev)
      for (const b of bets) {
        if (b.status === "laukia") next.add(b.signalId)
      }
      persistRemovedIds(next)
      return next
    })
  }, [])

  const loadBets = useCallback(async () => {
    if (isLoggedIn) {
      try {
        const res = await fetch("/api/bets", { cache: "no-store" })
        if (res.ok) {
          const data = (await res.json()) as { bets: ActiveBet[] }
          const bets = data.bets ?? []
          setActiveBets(bets)
          syncRemovedFromBets(bets)
          setBetsSynced(true)
          return
        }
      } catch {
        // fall through
      }
    }

    try {
      const raw = window.localStorage.getItem(LOCAL_BETS_KEY)
      const bets = raw ? (JSON.parse(raw) as ActiveBet[]) : []
      setActiveBets(bets)
      syncRemovedFromBets(bets)
    } catch {
      setActiveBets([])
    }
    setBetsSynced(true)
  }, [isLoggedIn, syncRemovedFromBets])

  useEffect(() => {
    void loadBets()
    if (!isLoggedIn) return
    const id = window.setInterval(() => void loadBets(), 5 * 60_000)
    return () => window.clearInterval(id)
  }, [loadBets, isLoggedIn])

  const markSignalRemoved = useCallback((signalId: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev).add(signalId)
      persistRemovedIds(next)
      return next
    })
  }, [])

  const placeBet = (signal: Signal) => {
    markSignalRemoved(signal.id)

    if (isLoggedIn) {
      void (async () => {
        try {
          const res = await fetch("/api/bets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              signalId: signal.id,
              sport: signal.sport,
              match: signal.match,
              betDescription: signal.betDescription,
              bookmaker: signal.bookmaker,
              odds: signal.odds,
              stake: signal.stake,
              marketType: signal.marketType ?? "moneyline",
              pickName: signal.pickName,
              homeName: signal.homeName,
              awayName: signal.awayName,
              gameKey: signal.gameKey,
              startsAt: signal.startsAt,
            }),
          })
          if (res.ok) {
            const data = (await res.json()) as { bet: ActiveBet }
            setActiveBets((prev) => {
              if (prev.some((b) => b.signalId === signal.id)) return prev
              return [data.bet, ...prev]
            })
            return
          }
        } catch {
          // fallback
        }
        setActiveBets((prev) => {
          const next = addLocalBetFromSignal(prev, signal)
          persistLocal(next)
          return next
        })
      })()
      return
    }

    setActiveBets((prev) => {
      const next = addLocalBetFromSignal(prev, signal)
      persistLocal(next)
      return next
    })
  }

  const settleBet = (id: string, status: Exclude<BetStatus, "laukia">) => {
    setActiveBets((prev) => {
      const next = prev.map((b) => {
        if (b.id !== id) return b
        let profit = 0
        if (status === "laimeta") profit = +(b.stake * (b.odds - 1)).toFixed(2)
        else if (status === "pralaimeta") profit = -b.stake
        return { ...b, status, profit }
      })
      if (!isLoggedIn) persistLocal(next)
      return next
    })
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
      betsSynced,
      isLoggedIn,
    }),
    [
      signals,
      activeBets,
      bankroll,
      baseBankroll,
      pendingCount,
      settledTodayCount,
      runningPnl,
      betsSynced,
      isLoggedIn,
    ],
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
