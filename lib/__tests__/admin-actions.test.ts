import { describe, expect, it } from 'vitest'
import { parseOwnerMutation } from '@/lib/admin-actions'

describe('owner account mutations', () => {
  it('requires a meaningful reason for every action', () => {
    expect(parseOwnerMutation('revoke', { reason: '  ' })).toEqual({ ok: false, error: 'reason' })
    expect(parseOwnerMutation('revoke', { reason: 'support request' })).toEqual({
      ok: true,
      value: { action: 'revoke', reason: 'support request', until: null, days: null },
    })
  })

  it('accepts only a future ISO date for a grant', () => {
    const now = new Date('2026-09-24T12:00:00Z')
    expect(parseOwnerMutation('grant', { reason: 'prize', until: '2026-10-01T00:00:00Z' }, now)).toMatchObject({
      ok: true,
      value: { action: 'grant', reason: 'prize', until: new Date('2026-10-01T00:00:00Z'), days: null },
    })
    expect(parseOwnerMutation('grant', { reason: 'prize', until: 'yesterday' }, now)).toEqual({ ok: false, error: 'until' })
    expect(parseOwnerMutation('grant', { reason: 'prize', until: '2026-09-20T00:00:00Z' }, now)).toEqual({ ok: false, error: 'until' })
  })

  it('bounds trial extensions', () => {
    expect(parseOwnerMutation('extend-trial', { reason: 'support', days: 7 })).toMatchObject({
      ok: true,
      value: { action: 'extend_trial', reason: 'support', days: 7, until: null },
    })
    expect(parseOwnerMutation('extend-trial', { reason: 'support', days: 0 })).toEqual({ ok: false, error: 'days' })
    expect(parseOwnerMutation('extend-trial', { reason: 'support', days: 366 })).toEqual({ ok: false, error: 'days' })
    expect(parseOwnerMutation('anything', { reason: 'support' })).toEqual({ ok: false, error: 'action' })
  })
})
