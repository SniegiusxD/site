'use client'

import { MotionConfig } from 'framer-motion'

/** Site-wide: framer-motion skips movement for visitors who ask for reduced motion. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
