'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SPRING } from '@/lib/motion'

type Status = 'online' | 'offline' | 'back'

/**
 * Prices on screen go stale the moment the connection drops, and nothing else
 * says so. A thin banner slides down while offline and turns into "Ryšys
 * grįžo" for a moment when the connection is back (the board asks for fresh
 * prices at that moment). It overlays the top edge, so nothing below moves.
 */
export function ConnectionBanner() {
  const [status, setStatus] = useState<Status>('online')

  useEffect(() => {
    let timer: number | undefined
    const offline = () => {
      window.clearTimeout(timer)
      setStatus('offline')
    }
    const online = () => {
      setStatus((current) => (current === 'offline' ? 'back' : current))
      timer = window.setTimeout(() => setStatus('online'), 2400)
    }
    if (!navigator.onLine) offline()
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [])

  return (
    <AnimatePresence>
      {status !== 'online' && (
        <motion.div
          role="status"
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={SPRING.soft}
          className={`fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 px-4 py-2 text-[0.9rem] font-medium transition-colors duration-300 ${
            status === 'offline' ? 'bg-warning text-night' : 'bg-pitch text-night'
          }`}
        >
          {status === 'offline' ? (
            <>
              <WifiOff className="size-4" aria-hidden />
              Nėra ryšio: kainos ekrane gali būti pasenusios
            </>
          ) : (
            <>
              <Check className="size-4" strokeWidth={3} aria-hidden />
              Ryšys grįžo
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
