import { describe, expect, it } from 'vitest'
import { stepRow } from '@/components/app/board/use-list-keys'
import type { BoardRow } from '@/lib/live-view'

const row = (id: string, book = '7BET') => ({ signal: { id }, price: { book } }) as unknown as BoardRow

describe('stepRow', () => {
  const rows = [row('a'), row('b'), row('b', 'Betsson'), row('c')]

  it('steps down and up from the current row, telling books apart', () => {
    expect(stepRow(rows, rows[1], 1)).toBe(rows[2])
    expect(stepRow(rows, rows[2], -1)).toBe(rows[1])
  })

  it('stops at the ends', () => {
    expect(stepRow(rows, rows[3], 1)).toBe(rows[3])
    expect(stepRow(rows, rows[0], -1)).toBe(rows[0])
  })

  it('starts at the top when nothing on the list is selected', () => {
    expect(stepRow(rows, null, 1)).toBe(rows[0])
    expect(stepRow(rows, row('gone'), 1)).toBe(rows[0])
    expect(stepRow([], null, 1)).toBeNull()
  })
})
