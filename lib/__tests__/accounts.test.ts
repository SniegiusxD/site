import { describe, expect, it } from 'vitest'
import { ltPlural } from '@/lib/format-lt'
import { DEFAULT_PREFERENCES, parsePreferences, suggestedStake } from '@/lib/preferences'
import { accessFrom, trialEndFrom } from '@/lib/subscription'

const NOW = new Date('2026-09-14T12:00:00Z')
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000)

describe('accessFrom', () => {
  it('gives a fresh trial 7 days of access', () => {
    const access = accessFrom({ status: 'trialing', trialEndsAt: trialEndFrom(NOW), currentPeriodEnd: null }, NOW)
    expect(access).toMatchObject({ state: 'trial', hasAccess: true, daysLeft: 7 })
  })

  it('rounds partial days up while the trial runs', () => {
    const access = accessFrom({ status: 'trialing', trialEndsAt: days(0.2), currentPeriodEnd: null }, NOW)
    expect(access.daysLeft).toBe(1)
  })

  it('expires the trial at its end', () => {
    const access = accessFrom({ status: 'trialing', trialEndsAt: days(-0.01), currentPeriodEnd: null }, NOW)
    expect(access).toMatchObject({ state: 'expired', hasAccess: false, daysLeft: 0 })
  })

  it('keeps access for an active plan until its period ends', () => {
    expect(accessFrom({ status: 'active', trialEndsAt: days(-30), currentPeriodEnd: days(12) }, NOW)).toMatchObject({
      state: 'active',
      hasAccess: true,
      daysLeft: 12,
    })
    expect(accessFrom({ status: 'active', trialEndsAt: days(-30), currentPeriodEnd: days(-1) }, NOW).hasAccess).toBe(false)
  })

  it('lets a canceled plan run to the end of the paid period', () => {
    expect(accessFrom({ status: 'canceled', trialEndsAt: days(-30), currentPeriodEnd: days(3) }, NOW)).toMatchObject({
      state: 'ending',
      hasAccess: true,
    })
    expect(accessFrom({ status: 'canceled', trialEndsAt: days(-30), currentPeriodEnd: days(-3) }, NOW).state).toBe('expired')
  })
})

describe('parsePreferences', () => {
  const valid = { ...DEFAULT_PREFERENCES, bookLimits: { TopSport: 50 } }

  it('accepts sensible input and orders books', () => {
    const result = parsePreferences({ ...valid, books: ['Betsson', '7BET', 'Betsson', 'Optibet'] })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.books).toEqual(['7BET', 'Betsson'])
      expect(result.value.bookLimits).toEqual({ TopSport: 50 })
    }
  })

  it('rejects no books, bad odds ranges and unknown Kelly shares', () => {
    expect(parsePreferences({ ...valid, books: [] }).ok).toBe(false)
    expect(parsePreferences({ ...valid, minOdds: 3, maxOdds: 2 }).ok).toBe(false)
    expect(parsePreferences({ ...valid, kellyFraction: 0.33 }).ok).toBe(false)
    expect(parsePreferences({ ...valid, bankroll: 5 }).ok).toBe(false)
    expect(parsePreferences({ ...valid, bookLimits: { '7BET': -4 } }).ok).toBe(false)
  })

  it('ignores empty limits', () => {
    const result = parsePreferences({ ...valid, bookLimits: { '7BET': '', Betsson: null } })
    expect(result.ok && result.value.bookLimits).toEqual({})
  })
})

describe('suggestedStake', () => {
  const prefs = { bankroll: 500, kellyFraction: 0.25, bookLimits: {} }

  it('matches the aggregator rule: quarter Kelly, 5 % cap', () => {
    // 1.95 against fair 1.845: full Kelly ~6.0 %, quarter ~1.5 % of 500 € = 7 €.
    expect(suggestedStake(prefs, 'Betsson', 1.95, 1.845)).toBe(7)
    // A huge edge is capped at 5 % of bankroll.
    expect(suggestedStake(prefs, 'Betsson', 5, 2)).toBe(25)
  })

  it('never exceeds the book limit and never goes negative', () => {
    expect(suggestedStake({ ...prefs, bankroll: 20_000, bookLimits: { TopSport: 50 } }, 'TopSport', 2.2, 2)).toBe(50)
    expect(suggestedStake(prefs, '7BET', 1.8, 1.9)).toBe(0)
  })
})

describe('ltPlural', () => {
  it('uses Lithuanian count forms', () => {
    const form = (n: number) => ltPlural(n, 'signalas', 'signalai', 'signalų')
    expect([1, 2, 9, 10, 11, 12, 19, 20, 21, 22, 30, 101].map(form)).toEqual([
      'signalas',
      'signalai',
      'signalai',
      'signalų',
      'signalų',
      'signalų',
      'signalų',
      'signalų',
      'signalas',
      'signalai',
      'signalų',
      'signalas',
    ])
  })
})
