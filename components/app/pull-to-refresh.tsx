'use client'

import { motion } from 'framer-motion'
import { Check, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { SPRING } from '@/lib/motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'

/** Pull distance (after resistance) that refreshes on release. */
const THRESHOLD = 55
const MAX_PULL = 110

type Phase = 'idle' | 'pulling' | 'refreshing' | 'done'

/**
 * Phones: pull down from the very top to refresh. A mark follows the finger
 * and turns with the pull; past the threshold, releasing refreshes and the
 * mark settles into a check. The page's own overscroll is contained while
 * mounted, so the browser's pull-to-reload does not fire as well.
 */
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<unknown> | void }) {
  const reduced = useReducedMotion()
  const [pull, setPull] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const start = useRef<number | null>(null)
  const pulled = useRef(0)
  const refresh = useRef(onRefresh)
  useEffect(() => {
    refresh.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const root = document.documentElement
    const before = root.style.overscrollBehaviorY
    root.style.overscrollBehaviorY = 'contain'

    const onStart = (event: TouchEvent) => {
      start.current = window.scrollY <= 0 && event.touches.length === 1 ? event.touches[0].clientY : null
    }
    const onMove = (event: TouchEvent) => {
      if (start.current === null) return
      const distance = event.touches[0].clientY - start.current
      if (distance <= 0 || window.scrollY > 0) {
        pulled.current = 0
        setPull(0)
        return
      }
      // Resistance: the mark moves half as far as the finger.
      pulled.current = Math.min(MAX_PULL, distance * 0.5)
      setPull(pulled.current)
      setPhase('pulling')
    }
    const onEnd = () => {
      if (start.current === null) return
      start.current = null
      const far = pulled.current >= THRESHOLD
      pulled.current = 0
      setPull(0)
      if (!far) {
        setPhase('idle')
        return
      }
      setPhase('refreshing')
      void Promise.resolve(refresh.current())
        .catch(() => undefined)
        .finally(() => {
          setPhase('done')
          window.setTimeout(() => setPhase('idle'), 700)
        })
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      root.style.overscrollBehaviorY = before
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  const visible = phase !== 'idle' && (pull > 0 || phase !== 'pulling')
  const offset = phase === 'pulling' ? pull : 48
  const ready = pull >= THRESHOLD
  return (
    <motion.div
      aria-hidden={phase !== 'refreshing'}
      role={phase === 'refreshing' ? 'status' : undefined}
      className="pointer-events-none fixed top-0 left-1/2 z-[65] -ml-5 lg:hidden"
      initial={false}
      animate={{ y: visible ? offset : -48, opacity: visible ? 1 : 0 }}
      transition={phase === 'pulling' || reduced ? { duration: 0 } : SPRING.soft}
    >
      <span
        className={`grid size-10 place-items-center rounded-full shadow-[0_10px_24px_-10px_rgb(0_0_0/0.7)] ${
          phase === 'done' || ready ? 'bg-floodlight text-night' : 'bg-stand text-chalk hairline'
        }`}
      >
        {phase === 'done' ? (
          <Check className="size-5" strokeWidth={3} />
        ) : (
          <RefreshCw
            className={`size-5 ${phase === 'refreshing' && !reduced ? 'animate-spin' : ''}`}
            style={phase === 'pulling' ? { transform: `rotate(${pull * 3}deg)` } : undefined}
          />
        )}
        {phase === 'refreshing' && <span className="sr-only">Atnaujinam…</span>}
      </span>
    </motion.div>
  )
}
