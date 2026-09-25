import { describe, expect, it } from 'vitest'
import { judgeHealth, resultsStale } from '@/lib/health'

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

describe('results freshness', () => {
  const now = new Date('2026-09-25T10:00:00Z')
  const fresh = '2026-09-25T09:00:00Z'

  it('is stuck when finished matches have had no result for a day, or never', () => {
    expect(resultsStale({ lastResultAt: '2026-09-24T09:00:00Z', finishedRecently: 40 }, now)).toBe(true)
    expect(resultsStale({ lastResultAt: null, finishedRecently: 40 }, now)).toBe(true)
  })

  it('is fine with a recent result, or with nothing to grade', () => {
    expect(resultsStale({ lastResultAt: fresh, finishedRecently: 40 }, now)).toBe(false)
    expect(resultsStale({ lastResultAt: null, finishedRecently: 0 }, now)).toBe(false)
  })

  it('fails health with its own name, but a missed cycle is named first', () => {
    const stuck = { lastResultAt: null, finishedRecently: 12 }
    expect(judgeHealth('2026-09-25T09:30:00Z', now, true, stuck)).toMatchObject({ ok: false, problem: 'results-stale' })
    expect(judgeHealth('2026-09-25T07:00:00Z', now, true, stuck).problem).toBe('stale')
    expect(judgeHealth('2026-09-25T09:30:00Z', now, true, { lastResultAt: fresh, finishedRecently: 12 })).toMatchObject({
      ok: true,
      lastResultAt: fresh,
    })
  })
})
