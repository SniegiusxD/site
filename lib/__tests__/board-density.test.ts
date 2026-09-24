import { describe, expect, it } from 'vitest'
import { densityCookie, densityFromCookie, parseDensity } from '@/lib/board-density'

describe('board density', () => {
  it('accepts only the two densities from storage', () => {
    expect(parseDensity('compact')).toBe('compact')
    expect(parseDensity('normal')).toBe('normal')
    expect(parseDensity('dense')).toBeUndefined()
    expect(parseDensity(1)).toBeUndefined()
  })

  it('renders the usual board for a missing or unknown cookie', () => {
    expect(densityFromCookie(undefined)).toBe('normal')
    expect(densityFromCookie('huge')).toBe('normal')
    expect(densityFromCookie('compact')).toBe('compact')
  })

  it('writes a year-long, site-wide cookie', () => {
    expect(densityCookie('compact')).toBe('kr-board-density=compact; Path=/; Max-Age=31536000; SameSite=Lax')
  })
})
