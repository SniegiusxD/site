'use client'

import { useEffect, useState } from 'react'
import { MOTION_KEY, type MotionMode } from '@/lib/motion-mode'

/**
 * The current motion mode, but always 'full' during the server render and
 * hydration, then the real value right after.
 *
 * framer-motion's own hook returns the real value on the first client render,
 * while the server always renders `false`. Any initial state, text or style
 * picked from it then differs between server and browser HTML, and React throws
 * away the server HTML (error #418) for every visitor with reduced motion on.
 */
export function useMotionMode(): MotionMode {
  const [mode, setMode] = useState<MotionMode>('full')

  useEffect(() => {
    const root = document.documentElement
    const read = () => setMode(root.dataset.motion === 'calm' ? 'calm' : 'full')
    read()
    // The boot script sets the attribute; the toggle changes it later.
    const observer = new MutationObserver(read)
    observer.observe(root, { attributes: true, attributeFilter: ['data-motion'] })
    return () => observer.disconnect()
  }, [])

  return mode
}

/** True when animation should stay still. */
export function useReducedMotion(): boolean {
  return useMotionMode() === 'calm'
}

/** Writes the choice and applies it to the current page. */
export function setMotionMode(mode: MotionMode): void {
  document.documentElement.dataset.motion = mode
  delete document.documentElement.dataset.motionOs
  try {
    localStorage.setItem(MOTION_KEY, mode)
  } catch {
    // Private mode: the choice holds for this page load only.
  }
}
