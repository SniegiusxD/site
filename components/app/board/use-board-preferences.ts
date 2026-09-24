'use client'

import { useCallback, useMemo } from 'react'
import { type Density, DENSITY_KEY, densityCookie, parseDensity } from '@/lib/board-density'
import { BOOKS, type BookName } from '@/lib/landing-signals'
import type { LiveSignal } from '@/lib/live-signals'
import { stringSet, useStoredState } from '@/lib/use-stored-state'

/**
 * Everything the board remembers on this device: pinned fixtures, hidden
 * signals, the last sort and filters, saved views and the row density. View
 * choices, not account settings, so browser storage (lib/use-stored-state.ts).
 */

export const HIDDEN_KEY = 'hidden-signals'
export const VIEW_KEY = 'board-view'
export const SEEN_KEY = 'board-last-visit'
export const PINNED_KEY = 'pinned-events'
// The fallback for a stored id list: one shared, never-mutated empty set.
const NO_IDS: Set<string> = new Set()
export const SAVED_KEY = 'board-saved-views'

/** One fixture, however many lines of it are published. */
export const pinKeyOf = (signal: LiveSignal) => signal.eventKey ?? `${signal.home ?? ''}|${signal.away ?? ''}`

/** A board the member named, so a routine does not have to be rebuilt each time. */
export type SavedView = {
  name: string
  sort: SortKey
  drift: 'all' | 'down' | 'up'
  sports: string[]
  markets: string[]
  periods: string[]
  minEdge: number
  books: BookName[]
}

const NO_VIEWS: SavedView[] = []

/** Saved views that are still whole; one broken entry does not cost the rest. */
export function parseSavedViews(value: unknown): SavedView[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string') return []
    const books = strings(item.books).filter((book): book is BookName => (BOOKS as readonly string[]).includes(book))
    return [
      {
        ...parseView(item)!,
        name: item.name,
        minEdge: typeof item.minEdge === 'number' ? item.minEdge : 0.02,
        // Applying a view with no book would empty the board; the filter never allows it.
        books: books.length ? books : [...BOOKS],
      },
    ]
  })
}

export type SortKey = 'value' | 'new' | 'soon' | 'moving'
export const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'value', label: 'Pagal vertę' },
  { key: 'new', label: 'Naujausi' },
  { key: 'soon', label: 'Greičiausiai prasideda' },
  { key: 'moving', label: 'Labiausiai juda' },
]

/** The filters and sort a member left the board with, on this device. */
export type StoredView = { sort: SortKey; drift: 'all' | 'down' | 'up'; sports: string[]; markets: string[]; periods: string[] }
const DEFAULT_VIEW: StoredView = { sort: 'value', drift: 'all', sports: [], markets: [], periods: [] }

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [])

/** Whatever part of a stored view still makes sense; the rest is the default. */
export function parseView(value: unknown): StoredView | undefined {
  if (!value || typeof value !== 'object') return undefined
  const view = value as Record<string, unknown>
  return {
    sort: SORTS.find((option) => option.key === view.sort)?.key ?? 'value',
    drift: view.drift === 'down' || view.drift === 'up' ? view.drift : 'all',
    sports: strings(view.sports),
    markets: strings(view.markets),
    periods: strings(view.periods),
  }
}

/**
 * The sort and filters, with one setter per field. Each setter patches its
 * field at call time, so applying a saved view (five setters in one click)
 * lands every field.
 */
export function useBoardView() {
  const [view, setView] = useStoredState(VIEW_KEY, parseView, DEFAULT_VIEW)
  const setters = useMemo(() => {
    const field =
      <K extends keyof StoredView>(key: K) =>
      (next: StoredView[K] | ((current: StoredView[K]) => StoredView[K])) =>
        setView((current) => ({
          ...current,
          [key]: typeof next === 'function' ? (next as (value: StoredView[K]) => StoredView[K])(current[key]) : next,
        }))
    return {
      setSort: field('sort'),
      setDrift: field('drift'),
      setSportsPicked: field('sports'),
      setMarkets: field('markets'),
      setPeriods: field('periods'),
    }
  }, [setView])
  return { ...view, ...setters }
}

export function useSavedViews() {
  return useStoredState(SAVED_KEY, parseSavedViews, NO_VIEWS)
}

/** The row density, starting from the server's cookie so the first frame is right. */
export function useDensity(initial: Density) {
  const [density, setDensity] = useStoredState(DENSITY_KEY, parseDensity, initial)
  const choose = useCallback(
    (next: Density) => {
      setDensity(next)
      // The server reads the cookie, so the next visit renders this density at once.
      document.cookie = densityCookie(next)
    },
    [setDensity],
  )
  return [density, choose] as const
}

/** Fixtures the member is watching. Keyed by event, so every line of the same match pins together. */
export function usePinned() {
  const [pinned, setPinned] = useStoredState(PINNED_KEY, stringSet, NO_IDS)

  const toggle = useCallback(
    (key: string) =>
      setPinned((current) => {
        const next = new Set(current)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        return next
      }),
    [setPinned],
  )

  return [pinned, toggle] as const
}

/** Signals the member hid on this device. A convenience only, so browser storage is fine. */
export function useHiddenSignals(signals: LiveSignal[]) {
  const [stored, save] = useStoredState(HIDDEN_KEY, stringSet, NO_IDS)

  // Signals that left the board are forgotten here, and dropped from storage
  // with the next hide or restore, so the list does not grow forever.
  const hidden = useMemo(() => {
    if (stored.size === 0 || signals.length === 0) return stored
    const present = new Set(signals.map((signal) => signal.id))
    const kept = [...stored].filter((id) => present.has(id))
    return kept.length === stored.size ? stored : new Set(kept)
  }, [stored, signals])

  return [hidden, save] as const
}
