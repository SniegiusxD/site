'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { PRESET } from '@/lib/motion'

/**
 * An empty list: a still icon that settles in once, one sentence that says
 * what to do, and (when there is one) the button that does it.
 */
export function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  className = '',
}: {
  icon: LucideIcon
  title: string
  text: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`text-center ${className}`}>
      <motion.span
        aria-hidden
        initial={PRESET.pop.initial}
        animate={PRESET.pop.animate}
        transition={PRESET.pop.transition}
        className="mx-auto grid size-12 place-items-center rounded-2xl bg-rail/60 text-haze"
      >
        <Icon className="size-6" />
      </motion.span>
      <p className="mt-4 font-display text-3xl font-bold">{title}</p>
      <p className="mx-auto mt-3 max-w-[26rem] text-haze">{text}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
