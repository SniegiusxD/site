'use client'

import { useEffect } from 'react'
import { useStoredOnce, writeStored } from '@/lib/use-stored-state'

/**
 * When the member last had a page open on this device, fixed for the whole
 * page view so rows do not stop being "new" while they are being read.
 *
 * The previous time is read once per mount (useStoredOnce); the start of this
 * visit is written under the same key a few seconds in, when the page is left
 * (pagehide) and on unmount. Writing it never changes what this view shows.
 */

/** A stored timestamp in milliseconds, or null when there is none or it is not a time. */
export function parseVisit(raw: string | null): number | null {
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

export function useLastVisit(key: string, saveAfterMs = 5_000): number | null {
  const previous = parseVisit(useStoredOnce(key))

  useEffect(() => {
    const started = String(Date.now())
    const save = () => writeStored(key, started)
    const timer = window.setTimeout(save, saveAfterMs)
    window.addEventListener('pagehide', save)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', save)
      save()
    }
  }, [key, saveAfterMs])

  return previous
}
