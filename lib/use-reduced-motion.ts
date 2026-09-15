'use client'

import { useEffect, useState } from 'react'

/**
 * The device's reduced-motion preference, but `false` during the server render
 * and hydration, then the real value right after.
 *
 * framer-motion's own hook returns the real value on the first client render,
 * while the server always renders `false`. Any initial state, text or style
 * picked from it then differs between server and browser HTML, and React throws
 * away the server HTML (error #418) for every visitor with reduced motion on.
 * Motion itself stays reduced for them through <MotionConfig reducedMotion="user">.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return reduced
}
