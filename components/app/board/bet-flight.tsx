'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { BoardBet } from '@/lib/exposure'
import { useReducedMotion } from '@/lib/use-reduced-motion'

export type Flight = { bet: BoardBet; from: { x: number; y: number }; to: { x: number; y: number } }

/**
 * "+1 statymas": a pill flies from where the bet was recorded into the daily
 * target, which bumps as it lands. Only when both ends are on screen (the
 * phone sheet covers the target) and never in calm mode.
 */
export function useBetFlight(addBet: (bet: BoardBet) => void, refreshBets: () => void) {
  const reduced = useReducedMotion()
  const targetRef = useRef<HTMLDivElement>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [bump, setBump] = useState(0)
  const onTracked = useCallback(
    (bet: BoardBet, from?: DOMRect) => {
      const to = targetRef.current?.getBoundingClientRect()
      const onScreen = (rect?: DOMRect): rect is DOMRect => Boolean(rect && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight)
      if (!reduced && from && from.width > 0 && onScreen(to)) {
        // Kept inside the screen: the detail can scroll between click and save.
        const fromY = Math.min(window.innerHeight - 40, Math.max(40, from.top + from.height / 2))
        setFlight({ bet, from: { x: from.left + from.width / 2, y: fromY }, to: { x: to.left + to.width / 2, y: to.top + to.height / 2 } })
        // The server copy arrives after the landing, so the count moves once.
        window.setTimeout(refreshBets, 1000)
      } else {
        addBet(bet)
        refreshBets()
      }
    },
    [addBet, refreshBets, reduced],
  )
  // The count changes when the pill lands, not when it leaves.
  const land = useCallback(() => {
    setFlight((current) => {
      if (current) addBet(current.bet)
      return null
    })
    setBump((value) => value + 1)
  }, [addBet])

  return { targetRef, bump, flight, onTracked, land }
}

/** The pill itself, in a low arc from the recorded bet to the daily target. */
export function BetFlight({ flight, onLanded }: { flight: Flight | null; onLanded: () => void }) {
  return (
    <AnimatePresence>
      {flight && (
        <motion.div
          key={flight.bet.id}
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-[60] -translate-x-1/2 -translate-y-1/2"
          initial={{ x: flight.from.x, y: flight.from.y, scale: 0.85, opacity: 0 }}
          animate={{
            x: [flight.from.x, (flight.from.x + flight.to.x) / 2, flight.to.x],
            y: [flight.from.y, Math.min(flight.from.y, flight.to.y) - 70, flight.to.y],
            scale: [0.85, 1.05, 0.55],
            opacity: [0, 1, 0.15],
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.45, 0, 0.2, 1], times: [0, 0.45, 1] }}
          onAnimationComplete={onLanded}
        >
          <span className="flex items-center gap-1.5 rounded-full bg-floodlight px-3.5 py-2 text-[0.95rem] font-semibold whitespace-nowrap text-night shadow-[0_12px_30px_-10px_rgb(91_229_132/0.7)]">
            <Check className="size-4" strokeWidth={3} aria-hidden />
            +1 statymas
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
