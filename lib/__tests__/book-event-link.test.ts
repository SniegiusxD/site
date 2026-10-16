import { describe, expect, it } from 'vitest'
import { safeBookEventUrl } from '@/lib/book-event-link'

describe('safeBookEventUrl', () => {
  it.each([
    ['TopSport', 'https://www.topsport.lt/odds/all/1/2/15/61700969'],
    ['Betsson', 'https://www.betsson.lt/lt/lazybos/krepsinis/x/x/x/event/28960044'],
    ['7BET', 'https://7bet.lt/sports/event/991404'],
  ] as const)('accepts a verified HTTPS %s event URL', (book, url) => {
    expect(safeBookEventUrl(book, url)).toBe(url)
  })

  it.each([
    ['TopSport', 'javascript:alert(1)'],
    ['TopSport', 'http://www.topsport.lt/odds/61700969'],
    ['TopSport', 'https://topsport.lt.evil.example/odds/61700969'],
    ['Betsson', 'https://www.topsport.lt/odds/61700969'],
    ['7BET', 'https://user:password@7bet.lt/sports/event/991404'],
    ['7BET', null],
  ] as const)('rejects an unsafe or mismatched URL for %s', (book, url) => {
    expect(safeBookEventUrl(book, url)).toBeNull()
  })
})
