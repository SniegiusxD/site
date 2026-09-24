import { describe, expect, it } from 'vitest'
import { parseVisit } from '@/lib/use-last-visit'

describe('parseVisit', () => {
  it('has no previous visit when nothing is stored', () => {
    expect(parseVisit(null)).toBeNull()
    expect(parseVisit('')).toBeNull()
  })

  it('reads a stored millisecond time', () => {
    expect(parseVisit('1790000000000')).toBe(1_790_000_000_000)
  })

  it('treats a value that is not a time as no visit, so nothing is marked new by accident', () => {
    expect(parseVisit('abc')).toBeNull()
    expect(parseVisit('0')).toBeNull()
    expect(parseVisit('-5')).toBeNull()
    expect(parseVisit('Infinity')).toBeNull()
  })
})
