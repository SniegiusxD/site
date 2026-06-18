"use client"

import { useCallback, useEffect, useState } from "react"

/** One recent surfaced bet row from the backend CLV tracker (#21). */
export interface ClvRow {
  game_signature: string
  sport: string
  bookmaker: string
  bet_type: string
  description: string
  entry_soft_odds: number | null
  closing_sharp_odds: number | null
  clv_pct: number | null
  status: "open" | "closed" | "expired"
  starts_at: string | null
}

export interface ClvBySport {
  sport: string
  n: number
  mean_clv_pct: number
}

export interface ClvStats {
  total: number
  closed: number
  open: number
  mean_clv_pct: number | null
  pct_positive: number | null
  by_sport: ClvBySport[]
  recent: ClvRow[]
  /** Closed bets with CLV — matches KPI "Įvertinta" count */
  recent_closed: ClvRow[]
  error?: string
}

const EMPTY: ClvStats = {
  total: 0, closed: 0, open: 0, mean_clv_pct: null,
  pct_positive: null, by_sport: [], recent: [], recent_closed: [],
}

const POLL_MS = 60_000

/** Polls the backend CLV validation stats (#21) for the analitika tab. */
export function useClv() {
  const [stats, setStats] = useState<ClvStats>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/clv", { cache: "no-store" })
      const data: ClvStats = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setStats(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepavyko gauti CLV")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  return { stats, isLoading, error, refresh }
}
