import { describe, expect, it } from 'vitest'
import { billingUpdateFrom, type StripeSubscriptionLike, userIdFrom } from '@/lib/billing/status'
import { accessFrom } from '@/lib/subscription'

const PERIOD_END = 1_790_000_000 // 2026-09-21T…Z, in seconds as Stripe sends it
const NOW = new Date(1_789_000_000 * 1000)

const sub = (over: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike => ({
  id: 'sub_1',
  status: 'active',
  customer: 'cus_1',
  cancel_at_period_end: false,
  cancel_at: null,
  ended_at: null,
  metadata: { userId: 'user-1' },
  items: { data: [{ current_period_end: PERIOD_END, price: { id: 'price_1' } }] },
  ...over,
})

/** What the member would see, through the same function the site uses. */
const accessFor = (update: ReturnType<typeof billingUpdateFrom>) =>
  accessFrom(
    { status: update!.status, trialEndsAt: null, trialStartedAt: null, currentPeriodEnd: update!.currentPeriodEnd },
    NOW,
  )

describe('billingUpdateFrom', () => {
  it('gives an active subscription access until the period end', () => {
    const update = billingUpdateFrom(sub())!
    expect(update.status).toBe('active')
    expect(update.currentPeriodEnd?.getTime()).toBe(PERIOD_END * 1000)
    expect(accessFor(update).state).toBe('active')
    expect(update.providerCustomerId).toBe('cus_1')
    expect(update.priceId).toBe('price_1')
  })

  it('treats a carried-over trial as paid access', () => {
    expect(accessFor(billingUpdateFrom(sub({ status: 'trialing' }))).tier).toBe('full')
  })

  it('keeps access while Stripe retries a failed renewal, and says so', () => {
    const update = billingUpdateFrom(sub({ status: 'past_due' }))!
    expect(update.paymentFailing).toBe(true)
    expect(accessFor(update).hasAccess).toBe(true)
  })

  it('reads a cancellation at period end as "ending", not as gone', () => {
    const update = billingUpdateFrom(sub({ cancel_at_period_end: true }))!
    expect(update.status).toBe('canceled')
    expect(update.cancelAtPeriodEnd).toBe(true)
    expect(accessFor(update).state).toBe('ending')
  })

  it('uses a scheduled cancel date as the end of access', () => {
    const cancelAt = PERIOD_END - 86_400
    const update = billingUpdateFrom(sub({ cancel_at: cancelAt }))!
    expect(update.currentPeriodEnd?.getTime()).toBe(cancelAt * 1000)
    expect(update.cancelAtPeriodEnd).toBe(true)
  })

  it.each(['canceled', 'unpaid', 'incomplete_expired', 'paused', 'something_new'])('ends access for %s', (status) => {
    const update = billingUpdateFrom(sub({ status, ended_at: 1_789_500_000 }))!
    expect(update.status).toBe('expired')
    expect(accessFor(update).tier).toBe('free')
  })

  it('leaves an incomplete first payment alone', () => {
    expect(billingUpdateFrom(sub({ status: 'incomplete' }))).toBeNull()
  })

  it('accepts an expanded customer object', () => {
    expect(billingUpdateFrom(sub({ customer: { id: 'cus_9' } }))!.providerCustomerId).toBe('cus_9')
  })
})

describe('userIdFrom', () => {
  it('reads the user id Checkout stored on the subscription', () => {
    expect(userIdFrom({ metadata: { userId: 'user-1' } })).toBe('user-1')
    expect(userIdFrom({ metadata: {} })).toBeNull()
    expect(userIdFrom({ metadata: null })).toBeNull()
  })
})
