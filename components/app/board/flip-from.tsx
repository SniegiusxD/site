'use client'

import { useAnimate } from 'framer-motion'
import { useLayoutEffect } from 'react'
import { SPRING } from '@/lib/motion'
import { useReducedMotion } from '@/lib/use-reduced-motion'

/**
 * A number that grows out of where it was: on mount it starts over the element
 * marked `data-flip={source}` (a board row's odds or value) and settles into
 * its own place. Transform only; calm mode and a missing source just show it.
 */
export function FlipFrom({ source, enabled = true, className, children }: { source: string; enabled?: boolean; className?: string; children: React.ReactNode }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>()
  const reduced = useReducedMotion()

  useLayoutEffect(() => {
    if (!enabled || reduced || !scope.current) return
    const from = document.querySelector(`[data-flip="${CSS.escape(source)}"]`)?.getBoundingClientRect()
    const to = scope.current.getBoundingClientRect()
    if (!from || !from.height || !to.height) return
    const scale = from.height / to.height
    animate(
      scope.current,
      { x: [from.left - to.left, 0], y: [from.top - to.top, 0], scale: [scale, 1], opacity: [0.6, 1] },
      SPRING.soft,
    )
    // Effectively once: the detail is keyed by signal and book, so it remounts.
  }, [animate, enabled, reduced, scope, source])

  return (
    <span ref={scope} className={`inline-block origin-top-left ${className ?? ''}`}>
      {children}
    </span>
  )
}
