'use client'

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'

/**
 * Per-device view choices (pinned fixtures, hidden signals, the last board
 * layout) kept in localStorage and read without an effect.
 *
 * The server has no storage, so its snapshot is `null` and the first client
 * render matches the server HTML; React then re-renders with the stored value.
 * The snapshot is the raw string — a primitive, so React sees the same value
 * until something writes. A setter notifies every hook on the same key in this
 * tab; other tabs hear about it through the `storage` event.
 *
 * `parse` and `fallback` must be stable (module-level), or the value is
 * rebuilt on every render.
 */

type Listener = () => void

const listeners = new Map<string, Set<Listener>>()
// What this tab wrote when storage refused it (private windows, a full quota):
// the choice then lasts for this page load instead of vanishing on the spot.
const memory = new Map<string, string | null>()

export function readStored(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, raw: string | null): void {
  try {
    if (raw === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, raw)
    memory.delete(key)
  } catch {
    memory.set(key, raw)
  }
  listeners.get(key)?.forEach((listener) => listener())
}

function subscribe(key: string, listener: Listener): () => void {
  let set = listeners.get(key)
  if (!set) listeners.set(key, (set = new Set()))
  set.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return
    memory.delete(key)
    listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    set.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Turns a stored string into a value, or the fallback when it is missing or broken. */
export function parseStored<T>(raw: string | null, parse: (value: unknown) => T | undefined, fallback: T): T {
  if (raw === null) return fallback
  try {
    const value = parse(JSON.parse(raw))
    return value === undefined ? fallback : value
  } catch {
    return fallback
  }
}

/** A JSON list of strings, as a set. Anything else in the list is dropped. */
export function stringSet(value: unknown): Set<string> | undefined {
  if (!Array.isArray(value)) return undefined
  return new Set(value.filter((item): item is string => typeof item === 'string'))
}

/** How a value goes into storage. Sets become plain lists. */
export function serializeStored(value: unknown): string {
  return JSON.stringify(value instanceof Set ? [...value] : value)
}

export function useStoredState<T>(
  key: string,
  parse: (value: unknown) => T | undefined,
  fallback: T,
): [T, (next: T | ((current: T) => T)) => void] {
  const raw = useSyncExternalStore(
    useCallback((listener: Listener) => subscribe(key, listener), [key]),
    () => readStored(key),
    () => null,
  )
  const value = useMemo(() => parseStored(raw, parse, fallback), [raw, parse, fallback])

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      // Read at call time, so two updates in one event both land.
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(parseStored(readStored(key), parse, fallback)) : next
      writeStored(key, serializeStored(resolved))
    },
    [key, parse, fallback],
  )

  return [value, set]
}

// Values read once per mount by useStoredOnce, by key.
const frozen = new Map<string, string | null>()

function frozenOf(key: string): string | null {
  if (!frozen.has(key)) frozen.set(key, readStored(key))
  return frozen.get(key) ?? null
}

const subscribeNever = () => () => {}

/**
 * A stored value as it was when this view opened, fixed until unmount: a
 * "last seen" marker the page may overwrite while it is open without moving
 * what the page shows. Server snapshot null, like useStoredState.
 */
export function useStoredOnce(key: string): string | null {
  const value = useSyncExternalStore(subscribeNever, () => frozenOf(key), () => null)
  useEffect(() => {
    // Frozen before any write this view makes, whatever order React reads in.
    frozenOf(key)
    return () => {
      frozen.delete(key)
    }
  }, [key])
  return value
}
