"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { mapOpportunities, type BackendOpportunity } from "./map-opportunity"
import type { Signal } from "./types"

interface SignalsResponse {
  timestamp: string | null
  count: number
  opportunities: BackendOpportunity[]
  error?: string
}

const POLL_MS = 60_000

/**
 * Polls the backend for value opportunities and maps them to Signals.
 *
 * `bankroll` feeds the per-signal Kelly stake calc. Raw opportunities are kept
 * in state and re-mapped via useMemo, so when the user edits their bankroll the
 * displayed stakes update instantly — no refetch needed.
 */
export function useSignals(bankroll = 1247) {
  const [rawOpps, setRawOpps] = useState<BackendOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/signals", { cache: "no-store" })
      const data: SignalsResponse = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setRawOpps(data.opportunities ?? [])
      setLastUpdated(data.timestamp)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nepavyko gauti signalų")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const signals: Signal[] = useMemo(
    () => mapOpportunities(rawOpps, bankroll),
    [rawOpps, bankroll],
  )

  return { signals, isLoading, error, lastUpdated, refresh }
}
