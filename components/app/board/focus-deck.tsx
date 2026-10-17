'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import type { BoardRow } from '@/lib/live-view'

/**
 * The focus layout: one signal at a time, its full detail (odds graph, stake,
 * "Pastačiau") as the page, stepped with the buttons or the arrow keys.
 */
export function FocusDeck({
  rows,
  current,
  onPick,
  children,
}: {
  rows: BoardRow[]
  current: BoardRow | null
  onPick: (row: BoardRow) => void
  children: ReactNode
}) {
  const index = current ? rows.findIndex((row) => row.signal.id === current.signal.id) : -1
  const step = (by: number) => {
    if (!rows.length) return
    const next = rows[(Math.max(index, 0) + by + rows.length) % rows.length]
    onPick(next)
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!rows.length) return null
  return (
    <div>
      <nav aria-label="Signalai po vieną" className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-rail bg-night/90 px-4 py-2 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => step(-1)}
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[0.9rem] font-medium text-chalk hairline hover:bg-stand"
        >
          <ChevronLeft className="size-4" aria-hidden />
          Ankstesnis
        </button>
        <span className="text-[0.9rem] text-haze tnum" aria-live="polite">
          {index + 1} / {rows.length}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          className="inline-flex min-h-11 items-center gap-1 rounded-full bg-chalk px-3 text-[0.9rem] font-medium text-night hover:bg-chalk/90"
        >
          Kitas
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </nav>
      {children}
    </div>
  )
}
