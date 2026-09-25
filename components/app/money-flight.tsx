'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { DURATION } from '@/lib/motion'

export type MoneyFlightPath = { label: string; from: { x: number; y: number }; to: { x: number; y: number } }

/** Both ends visible, so the pill never flies to or from off-screen. */
export const onScreen = (rect?: DOMRect | null): rect is DOMRect =>
  Boolean(rect && rect.width > 0 && rect.bottom > 0 && rect.top < window.innerHeight)

export const centerOf = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })

/**
 * A win on its way into the result: "+12,40 €" rises from where it settled and
 * lands in the running total, which rolls up as it arrives. Same arc as the
 * "+1 statymas" pill on the board. Only for wins, never in calm mode.
 */
export function MoneyFlight({ path, onLanded }: { path: MoneyFlightPath | null; onLanded: () => void }) {
  return (
    <AnimatePresence>
      {path && (
        <motion.div
          key={path.label}
          aria-hidden
          className="pointer-events-none fixed top-0 left-0 z-[60] -translate-x-1/2 -translate-y-1/2"
          initial={{ x: path.from.x, y: path.from.y, scale: 0.8, opacity: 0 }}
          animate={{
            x: [path.from.x, (path.from.x + path.to.x) / 2, path.to.x],
            y: [path.from.y, Math.min(path.from.y, path.to.y) - 80, path.to.y],
            scale: [0.8, 1.1, 0.6],
            opacity: [0, 1, 0.2],
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.celebrate + 0.1, ease: [0.45, 0, 0.2, 1], times: [0, 0.4, 1] }}
          onAnimationComplete={onLanded}
        >
          <span className="rounded-full bg-floodlight px-4 py-2 font-display text-[1.1rem] font-bold whitespace-nowrap text-night tnum shadow-[0_12px_30px_-10px_rgb(91_229_132/0.7)]">
            {path.label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
