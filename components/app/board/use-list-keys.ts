'use client'

import { useEffect } from 'react'
import type { BoardRow } from '@/lib/live-view'

/** Pure: the row `by` steps from the current one, clamped to the list. Nothing selected starts at the top. */
export function stepRow(rows: BoardRow[], current: BoardRow | null, by: number): BoardRow | null {
  if (!rows.length) return null
  const index = current ? rows.findIndex((row) => row.signal.id === current.signal.id && row.price.book === current.price.book) : -1
  if (index < 0) return rows[0]
  return rows[Math.min(rows.length - 1, Math.max(0, index + by))]
}

/**
 * Desktop, like a terminal: ↑/↓ (or k/j) move the selection through the list
 * and the detail beside it follows. Ignored while typing, inside option
 * panels and dialogs, or with a modifier held.
 */
export function useListKeys(enabled: boolean, rows: BoardRow[], current: BoardRow | null, onPick: (row: BoardRow) => void) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return
      if (target?.closest('[role="dialog"],[role="radio"],[role="checkbox"],[role="menu"],[role="listbox"]')) return
      const by = event.key === 'ArrowDown' || event.key === 'j' ? 1 : event.key === 'ArrowUp' || event.key === 'k' ? -1 : 0
      if (!by) return
      const next = stepRow(rows, current, by)
      if (!next) return
      event.preventDefault()
      onPick(next)
      // The picked row is marked aria-current once React has rendered it.
      requestAnimationFrame(() => document.querySelector('[aria-label="Signalų sąrašas"] [aria-current="true"]')?.scrollIntoView({ block: 'nearest' }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled, rows, current, onPick])
}
