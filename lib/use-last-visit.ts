'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { readStored, writeStored } from '@/lib/use-stored-state'

/**
 * When the member last had a page open on this device, fixed for the whole
 * page view so rows do not stop being "new" while they are being read.
 *
 * The previous time is read once per mount and kept here; the start of this
 * visit is written under the same key a few seconds in, when the page is left
 * (pagehide) and on unmount. Writing it never changes what this view shows.
 */

type Visit = { previous: number | null; started: number }

const visits = new Map<string, Visit>()

/** A stored timestamp in milliseconds, or null when there is none or it is not a time. */
export function parseVisit(raw: string | null): number | null {
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function visitOf(key: string): Visit {
  let visit = visits.get(key)
  if (!visit) {
    visit = { previous: parseVisit(readStored(key)), started: Date.now() }
    visits.set(key, visit)
  }
  return visit
}

// Nothing outside this hook changes the frozen value, so there is nothing to listen to.
const subscribeNever = () => () => {}

export function useLastVisit(key: string, saveAfterMs = 5_000): number | null {
  const previous = useSyncExternalStore(subscribeNever, () => visitOf(key).previous, () => null)

  useEffect(() => {
    // Frozen before anything is written, whatever order React reads the snapshot in.
    const visit = visitOf(key)
    const save = () => writeStored(key, String(visit.started))
    const timer = window.setTimeout(save, saveAfterMs)
    window.addEventListener('pagehide', save)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', save)
      save()
      // The next mount is the next visit, and reads the time just written.
      visits.delete(key)
    }
  }, [key, saveAfterMs])

  return previous
}
