'use client'

import { motion } from 'framer-motion'
import { DURATION, EASE } from '@/lib/motion'

/**
 * Re-mounted on every navigation inside the app, so each page arrives with a
 * short fade and rise while the nav highlight slides across. Transform and
 * opacity only; calm mode makes it instant through MotionConfig.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DURATION.settle, ease: EASE }}>
      {children}
    </motion.div>
  )
}
