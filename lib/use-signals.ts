"use client"

import { useCallback, useEffect, useState } from "react"
import { mapOpportunities, type BackendOpportunity } from "./map-opportunity"
import type { Signal } from "./types"

interface SignalsResponse {
  timestamp: string | null
  count: number
  opportunities: BackendOpportunity[]
  error?: string
}

const POLL_MS = 60_000

export function useSignals() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/signals", { cache: "no-store" })
      const data: SignalsResponse = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      setSignals(mapOpportunities(data.opportunities ?? []))
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

  return { signals, isLoading, error, lastUpdated, refresh }
}
