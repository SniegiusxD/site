import { describe, expect, it } from 'vitest'
import { executionTiming, parseExecutionEvent } from '@/lib/execution-events'

describe('parseExecutionEvent', () => {
  const valid = { signalId: 'ls2_abc', book: 'TopSport', kind: 'open_book', shownOdds: 2.1, shownEdge: 0.04, firstSeenAt: '2026-09-24T10:00:00Z' }

  it('accepts a well-formed event', () => {
    expect(parseExecutionEvent(valid)).toEqual({ ...valid, firstSeenAt: '2026-09-24T10:00:00.000Z' })
  })

  it('rejects unknown books, kinds and empty ids', () => {
    expect(parseExecutionEvent({ ...valid, book: 'Optibet' })).toBeNull()
    expect(parseExecutionEvent({ ...valid, kind: 'placed' })).toBeNull()
    expect(parseExecutionEvent({ ...valid, signalId: '  ' })).toBeNull()
    expect(parseExecutionEvent(null)).toBeNull()
  })

  it('drops implausible numbers and dates instead of storing them', () => {
    const event = parseExecutionEvent({ ...valid, shownOdds: 0.5, shownEdge: 'x', firstSeenAt: 'soon' })
    expect(event).toMatchObject({ shownOdds: null, shownEdge: null, firstSeenAt: null })
  })
})

describe('executionTiming', () => {
  it('measures seen → step → bet in minutes, and the odds slip', () => {
    expect(
      executionTiming(
        { firstSeenAt: '2026-09-24T10:00:00Z', at: '2026-09-24T10:06:00Z', shownOdds: 2.1 },
        { placedAt: '2026-09-24T10:09:00Z', odds: 2.05 },
      ),
    ).toEqual({ seenToAction: 6, actionToBet: 3, oddsSlip: -0.05 })
  })

  it('leaves unknown parts empty rather than zero', () => {
    expect(executionTiming({ firstSeenAt: null, at: '2026-09-24T10:06:00Z', shownOdds: null }, null)).toEqual({
      seenToAction: null,
      actionToBet: null,
      oddsSlip: null,
    })
  })
})
