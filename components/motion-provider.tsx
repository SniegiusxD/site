'use client'

import { MotionConfig } from 'framer-motion'
import { useMotionMode } from '@/lib/use-reduced-motion'

/** Site-wide: framer-motion follows the mode on <html data-motion>. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const mode = useMotionMode()
  return <MotionConfig reducedMotion={mode === 'calm' ? 'always' : 'never'}>{children}</MotionConfig>
}
