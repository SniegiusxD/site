'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoardBet } from '@/lib/exposure'
import type { LiveBoard } from '@/lib/live-signals'
import { pollPulses, type Pulse } from '@/lib/price-movement'

const POLL_MS = 60_000

/**
 * The live board and the member's recent bets, kept fresh: a poll every
 * minute while the tab is visible, one more the moment it comes back, and a
 * clock tick every 30 s so "starts in" labels move. A 401/402 means access
 * changed elsewhere, so the server page is asked again.
 */
export function useLiveBoard(initial: LiveBoard, initialBets: BoardBet[]) {
  const router = useRouter()
  const [board, setBoard] = useState(initial)
  const [bets, setBets] = useState(initialBets)
  const [now, setNow] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // What changed since the previous poll: new signals glow once, moved prices flash up or down.
  const [pulses, setPulses] = useState<Map<string, Pulse>>(() => new Map())
  const shownBoard = useRef(initial)
  const pulseTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(pulseTimer.current), [])
  const showBoard = useCallback((next: LiveBoard) => {
    const changed = pollPulses(shownBoard.current.signals, next.signals)
    shownBoard.current = next
    setBoard(next)
    if (changed.size === 0) return
    setPulses(changed)
    window.clearTimeout(pulseTimer.current)
    pulseTimer.current = window.setTimeout(() => setPulses(new Map()), 4000)
  }, [])

  const refreshBets = useCallback(async () => {
    try {
      const response = await fetch('/api/bets/recent', { cache: 'no-store' })
      if (response.ok) setBets((await response.json()).bets)
    } catch {
      // The board still works; the target and warnings catch up on the next poll.
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const [response] = await Promise.all([fetch('/api/live', { cache: 'no-store' }), refreshBets()])
      if (response.status === 402 || response.status === 401) {
        router.refresh()
        return
      }
      if (!response.ok) throw new Error()
      showBoard(await response.json())
      setLoadError(null)
    } catch {
      setLoadError('Nepavyko atnaujinti signalų. Bandysim dar kartą po minutės.')
    } finally {
      setRefreshing(false)
      setNow(new Date())
    }
  }, [router, refreshBets, showBoard])

  useEffect(() => {
    // A background tab does not need fresh odds: it polls again the moment it
    // comes back, so a hidden board stops asking.
    const poll = window.setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS)
    const tick = window.setInterval(() => document.visibilityState === 'visible' && setNow(new Date()), 30_000)
    const onFocus = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refresh])

  // A bet recorded on this page, shown before the server copy comes back.
  const addBet = useCallback((bet: BoardBet) => setBets((current) => [bet, ...current.filter((item) => item.id !== bet.id)]), [])

  return { board, bets, addBet, now, refreshing, loadError, pulses, refresh, refreshBets }
}
