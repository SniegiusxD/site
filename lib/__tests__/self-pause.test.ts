import { describe, expect, it } from 'vitest'
import { activePause, nextPauseEnd, parsePauseDays } from '@/lib/self-pause'

const now = new Date('2026-09-25T20:00:00Z')

describe('parsePauseDays', () => {
  it('accepts only the offered lengths', () => {
    expect(parsePauseDays(1)).toBe(1)
    expect(parsePauseDays(7)).toBe(7)
    expect(parsePauseDays(30)).toBe(30)
    for (const value of [0, 2, -7, 365, '7', null, undefined, 7.5]) expect(parsePauseDays(value)).toBeNull()
  })
})

describe('nextPauseEnd', () => {
  it('starts a break from now', () => {
    expect(nextPauseEnd(null, 7, now).toISOString()).toBe('2026-10-02T20:00:00.000Z')
  })

  it('never shortens a longer break already running', () => {
    const running = new Date('2026-10-20T00:00:00Z')
    expect(nextPauseEnd(running, 1, now)).toBe(running)
  })

  it('extends a shorter break', () => {
    const running = new Date('2026-09-26T00:00:00Z')
    expect(nextPauseEnd(running, 30, now).toISOString()).toBe('2026-10-25T20:00:00.000Z')
  })
})

describe('activePause', () => {
  it('is on only while the end is in the future', () => {
    expect(activePause('2026-09-26T00:00:00Z', now)?.toISOString()).toBe('2026-09-26T00:00:00.000Z')
    expect(activePause('2026-09-25T19:59:59Z', now)).toBeNull()
    expect(activePause(null, now)).toBeNull()
    expect(activePause('not a date', now)).toBeNull()
  })
})
