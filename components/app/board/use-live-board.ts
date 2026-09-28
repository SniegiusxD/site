'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BoardBet } from '@/lib/exposure'
import type { LiveBoard } from '@/lib/live-signals'
import { pollErrorMessage } from '@/lib/api-error'
import { pollPulses, type Pulse } from '@/lib/price-movement'
import { ApiError, fetchJson } from '@/lib/use-api'

const POLL_MS = 60_000
/**
 * A visible tab nobody touches for this long stops polling until someone moves,
 * types, scrolls or taps: each poll wakes the database, and on the free tier a
 * forgotten open board kept it from ever sleeping (Neon compute at 80 %, 09-28).
 */
export const IDLE_AFTER_MS = 15 * 60_000

/** Pure: may a timed poll run now? */
export function shouldPoll(visible: boolean, lastActivityAt: number, now: number) {
  return visible && now - lastActivityAt < IDLE_AFTER_MS
}

/**
 * The live board and the member's recent bets, kept fresh: a poll every
 * minute while the tab is visible and in use, one more the moment it comes
 * back (or someone returns after 15 idle minutes), and a
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
      setBets((await fetchJson<{ bets: BoardBet[] }>('/api/bets/recent')).bets)
    } catch {
      // The board still works; the target and warnings catch up on the next poll.
    }
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const [board] = await Promise.all([fetchJson<LiveBoard>('/api/live'), refreshBets()])
      showBoard(board)
      setLoadError(null)
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : null
      // Signed out or access changed elsewhere: the server page decides what to show.
      if (error?.status === 401 || error?.status === 402) {
        router.refresh()
        return
      }
      setLoadError(pollErrorMessage(error))
    } finally {
      setRefreshing(false)
      setNow(new Date())
    }
  }, [router, refreshBets, showBoard])

  useEffect(() => {
    // A background tab does not need fresh odds: it polls again the moment it
    // comes back, so a hidden board stops asking.
    let lastActivity = Date.now()
    let idle = false
    const poll = window.setInterval(() => {
      if (shouldPoll(document.visibilityState === 'visible', lastActivity, Date.now())) refresh()
      else idle = true
    }, POLL_MS)
    // Coming back after an idle stretch refreshes at once instead of waiting a minute.
    const onActivity = () => {
      lastActivity = Date.now()
      if (idle && document.visibilityState === 'visible') {
        idle = false
        refresh()
      }
    }
    const activity = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const
    activity.forEach((type) => window.addEventListener(type, onActivity, { passive: true }))
    const tick = window.setInterval(() => document.visibilityState === 'visible' && setNow(new Date()), 30_000)
    const onFocus = () => {
      if (document.visibilityState !== 'visible') return
      lastActivity = Date.now()
      idle = false
      refresh()
    }
    document.addEventListener('visibilitychange', onFocus)
    // Back online: fresh prices now, not at the next minute.
    window.addEventListener('online', onFocus)
    return () => {
      window.clearInterval(poll)
      window.clearInterval(tick)
      activity.forEach((type) => window.removeEventListener(type, onActivity))
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('online', onFocus)
    }
  }, [refresh])

  // A bet recorded on this page, shown before the server copy comes back.
  const addBet = useCallback((bet: BoardBet) => setBets((current) => [bet, ...current.filter((item) => item.id !== bet.id)]), [])

  return { board, bets, addBet, now, refreshing, loadError, pulses, refresh, refreshBets }
}
