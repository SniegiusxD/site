import { describe, expect, it } from 'vitest'
import { countAccess, isOwner, ownerEmails } from '@/lib/owner'

describe('owner access', () => {
  it('reads a comma list, ignoring case and spaces', () => {
    expect(ownerEmails(' A@x.lt, b@Y.lt ,,')).toEqual(['a@x.lt', 'b@y.lt'])
    expect(isOwner('B@y.lt', 'a@x.lt,b@y.lt')).toBe(true)
  })

  it('is nobody when the variable is missing or the email is empty', () => {
    expect(isOwner('a@x.lt', undefined)).toBe(false)
    expect(isOwner('', 'a@x.lt')).toBe(false)
    expect(isOwner(null, 'a@x.lt')).toBe(false)
  })
})

describe('countAccess', () => {
  const now = new Date('2026-09-24T12:00:00Z')
  const future = '2026-10-10T00:00:00Z'
  const past = '2026-09-01T00:00:00Z'
  it('counts states with the same rules as accessFrom and paying Stripe members', () => {
    const { counts, payingStripe } = countAccess(
      [
        { status: 'free', trialEndsAt: null, trialStartedAt: null, currentPeriodEnd: null, provider: null },
        { status: 'trialing', trialEndsAt: future, trialStartedAt: past, currentPeriodEnd: null, provider: null },
        { status: 'active', trialEndsAt: past, trialStartedAt: past, currentPeriodEnd: future, provider: 'stripe' },
        { status: 'canceled', trialEndsAt: past, trialStartedAt: past, currentPeriodEnd: future, provider: 'stripe' },
        { status: 'trialing', trialEndsAt: past, trialStartedAt: past, currentPeriodEnd: null, provider: null },
        { status: 'expired', trialEndsAt: past, trialStartedAt: past, currentPeriodEnd: past, adminAccessUntil: future, provider: 'stripe' },
      ],
      now,
    )
    expect(counts).toEqual({ free: 1, trial: 1, active: 2, ending: 1, expired: 1 })
    expect(payingStripe).toBe(1)
  })
})

describe('fillDays', () => {
  it('returns every day of the window, zero where empty, in Vilnius dates', async () => {
    const { fillDays } = await import('@/lib/owner')
    const days = fillDays([{ day: '2026-09-23', count: 2 }], new Date('2026-09-24T21:30:00Z'), 3)
    // 21:30 UTC is already the 25th in Vilnius.
    expect(days).toEqual([
      { day: '2026-09-23', count: 2 },
      { day: '2026-09-24', count: 0 },
      { day: '2026-09-25', count: 0 },
    ])
  })
})
