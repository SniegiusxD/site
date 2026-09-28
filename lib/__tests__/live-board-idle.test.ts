import { describe, expect, it } from 'vitest'
import { IDLE_AFTER_MS, shouldPoll } from '@/components/app/board/use-live-board'

describe('shouldPoll', () => {
  const now = 1_000_000_000
  it('polls a visible board someone used recently', () => {
    expect(shouldPoll(true, now - 60_000, now)).toBe(true)
  })
  it('stops for a hidden tab', () => {
    expect(shouldPoll(false, now, now)).toBe(false)
  })
  it('stops for a visible tab nobody touched for 15 minutes, so the database can sleep', () => {
    expect(shouldPoll(true, now - IDLE_AFTER_MS, now)).toBe(false)
    expect(shouldPoll(true, now - IDLE_AFTER_MS + 1, now)).toBe(true)
  })
})
