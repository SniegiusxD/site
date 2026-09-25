'use client'

import { AnimatePresence, motion, useDragControls } from 'framer-motion'
import { useRef } from 'react'
import { useFocusTrap } from '@/lib/use-focus-trap'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { EASE } from '@/lib/motion'


/**
 * The signal detail on phones: a full-screen sheet that rises from the bottom.
 * Pull the handle down to close; only the handle starts a drag, so the content
 * still scrolls. Escape closes it too.
 */
export function PhoneSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const reduced = useReducedMotion()
  const drag = useDragControls()
  // Focus moves into the sheet, stays there, and returns to the row; Escape closes it.
  const sheetRef = useRef<HTMLDivElement>(null)
  useFocusTrap(sheetRef, open, onClose)
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={sheetRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Signalo informacija"
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '100%' }}
          transition={{ duration: 0.4, ease: EASE }}
          drag={reduced ? false : 'y'}
          dragControls={drag}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 700) onClose()
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-night"
        >
          <div onPointerDown={(event) => drag.start(event)} className="sticky top-0 z-20 flex h-7 touch-none items-center justify-center bg-night">
            <span aria-hidden className="h-1 w-10 rounded-full bg-rail-strong" />
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
