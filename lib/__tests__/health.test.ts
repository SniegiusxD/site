import { describe, expect, it } from 'vitest'
import { judgeHealth } from '@/lib/health'

describe('judgeHealth', () => {
  const now = new Date('2026-09-24T16:00:00Z')

  it('is healthy within 90 minutes of the last publication', () => {
    expect(judgeHealth('2026-09-24T15:00:00Z', now)).toMatchObject({ ok: true, minutesSincePublish: 60, problem: null })
  })

  it('flags a missed cycle as stale', () => {
    // The 09-24 outage: last publication 12:22 UTC, checked at 16:00.
    expect(judgeHealth('2026-09-24T12:22:00Z', now)).toMatchObject({ ok: false, minutesSincePublish: 218, problem: 'stale' })
  })

  it('names a missing status row and a failed database separately', () => {
    expect(judgeHealth(null, now).problem).toBe('no-status')
    expect(judgeHealth(null, now, false).problem).toBe('database')
  })
})
