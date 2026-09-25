'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ltPlural } from '@/lib/format-lt'
import { SPRING } from '@/lib/motion'
import type { Pulse } from '@/lib/price-movement'
import { useReducedMotion } from '@/lib/use-reduced-motion'

/**
 * New signals landed above where the member is reading. Instead of letting
 * them slip in unseen, a pill says how many and takes the member up to them,
 * where they glow once (the board's 'new' pulse). It goes away by itself when
 * the member scrolls back to the top.
 */
export function NewSignalsPill({ pulses, listTop }: { pulses: Map<string, Pulse>; listTop: React.RefObject<HTMLDivElement | null> }) {
  const reduced = useReducedMotion()
  const [below, setBelow] = useState(false)
  const [unseen, setUnseen] = useState(0)
  const [counted, setCounted] = useState(pulses)

  // Each poll's pulses are counted once, when they arrive.
  if (pulses !== counted) {
    setCounted(pulses)
    const arrived = [...pulses.values()].filter((pulse) => pulse === 'new').length
    if (arrived > 0 && below) setUnseen((value) => value + arrived)
  }

  useEffect(() => {
    const onScroll = () => {
      const top = listTop.current?.getBoundingClientRect().top ?? 0
      const scrolledPast = top < 0
      setBelow(scrolledPast)
      if (!scrolledPast) setUnseen(0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [listTop])

  const show = unseen > 0 && below
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={() => {
            listTop.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
            setUnseen(0)
          }}
          initial={reduced ? false : { opacity: 0, y: -16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.95 }}
          transition={SPRING.snappy}
          className="fixed top-20 left-1/2 z-40 -translate-x-1/2 rounded-full bg-floodlight px-4 py-2.5 font-semibold text-night shadow-[0_14px_34px_-12px_rgb(91_229_132/0.7)]"
        >
          <span className="flex items-center gap-1.5">
            <ArrowUp className="size-4" strokeWidth={2.5} aria-hidden />
            {unseen} {ltPlural(unseen, 'naujas signalas', 'nauji signalai', 'naujų signalų')}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
