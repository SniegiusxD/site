'use client'

import { MotionConfig } from 'framer-motion'
import { useEffect, useState } from 'react'
import { setMotionMode, useMotionMode } from '@/lib/use-reduced-motion'

/** Site-wide: framer-motion follows the mode on <html data-motion>. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const mode = useMotionMode()
  return (
    <MotionConfig reducedMotion={mode === 'calm' ? 'always' : 'never'}>
      {children}
      <MotionNotice />
    </MotionConfig>
  )
}

/**
 * Shown only when the operating system asked for reduced motion and the visitor
 * has not chosen for themselves. Windows "best performance" and gaming tweak
 * tools set that flag, so plenty of people land on a completely still site
 * without knowing why.
 */
function MotionNotice() {
  const [asked, setAsked] = useState(false)

  useEffect(() => {
    setAsked(document.documentElement.dataset.motionOs === 'calm')
  }, [])

  if (!asked) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:left-5 sm:bottom-5 sm:max-w-[23rem]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl bg-chalk px-4 py-3.5 text-[0.9rem] text-night shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)]">
        <p className="min-w-[12rem] flex-1">Tavo kompiuteryje animacijos išjungtos, todėl puslapis stovi vietoje.</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMotionMode('full')
              setAsked(false)
            }}
            className="min-h-11 rounded-xl bg-night px-3.5 font-semibold text-chalk"
          >
            Įjungti
          </button>
          <button
            type="button"
            onClick={() => {
              setMotionMode('calm')
              setAsked(false)
            }}
            className="min-h-11 rounded-xl px-3 font-medium text-night/60 hover:text-night"
          >
            Palikti
          </button>
        </div>
      </div>
    </div>
  )
}
