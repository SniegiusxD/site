import { describe, expect, it } from 'vitest'
import { FINISHED_STEP, FUNNEL_STEPS } from '@/lib/funnel-client'
import { parseFunnelEvent } from '@/lib/onboarding-funnel'

const visitor = 'a1b2c3d4e5f6a7b8c9d0e1f2'

describe('parseFunnelEvent', () => {
  it('accepts a random browser id and a known step', () => {
    expect(parseFunnelEvent({ visitor, step: 0 })).toEqual({ visitor, step: 0 })
    expect(parseFunnelEvent({ visitor, step: FINISHED_STEP })).toEqual({ visitor, step: FINISHED_STEP })
  })

  it('rejects anything else', () => {
    for (const input of [
      null,
      'x',
      { visitor, step: -1 },
      { visitor, step: FINISHED_STEP + 1 },
      { visitor, step: 1.5 },
      { visitor: 'short', step: 1 },
      { visitor: 'user@example.com-looks-like-an-id', step: 1 },
      { visitor: visitor.toUpperCase(), step: 1 },
    ]) {
      expect(parseFunnelEvent(input)).toBeNull()
    }
  })

  it('ends with the finished step after the seven onboarding steps', () => {
    expect(FUNNEL_STEPS).toHaveLength(8)
    expect(FUNNEL_STEPS[FINISHED_STEP]).toBe('Baigė')
  })
})
