import type { BookName } from '@/lib/landing-signals'

export type BookLimits = Partial<Record<BookName, number>>

export type LimitChange = {
  bookmaker: BookName
  /** The limit before, or null when the member had none. */
  from: number | null
  /** The limit after, or null when they removed it. */
  to: number | null
}

export type LimitEvent = LimitChange & { id: string; at: string }

/**
 * What changed between two sets of bookmaker limits. Order is stable so the
 * history reads the same way it was written, and unchanged books produce
 * nothing: re-saving the same settings must not look like a new limit.
 */
export function limitChanges(before: BookLimits, after: BookLimits): LimitChange[] {
  const books = [...new Set([...Object.keys(before), ...Object.keys(after)])] as BookName[]
  const changes: LimitChange[] = []
  for (const book of books.sort()) {
    const from = before[book] ?? null
    const to = after[book] ?? null
    if (from === to) continue
    changes.push({ bookmaker: book, from, to })
  }
  return changes
}

/** How the change reads in the history: a cut, a raise, a new limit or a removed one. */
export function limitDirection(change: LimitChange): 'cut' | 'raised' | 'set' | 'removed' {
  if (change.from === null) return 'set'
  if (change.to === null) return 'removed'
  return change.to < change.from ? 'cut' : 'raised'
}
