/**
 * How a Stripe subscription becomes access on the site. Pure, so the rules can
 * be tested without Stripe: the webhook, the return-from-checkout sync and any
 * later reconciliation all go through this one function.
 *
 * The app's own `subscription.status` is the only thing access reads
 * (lib/subscription.ts `accessFrom`), so everything Stripe can say is folded
 * into the five states that table allows.
 */

/** The fields this module reads, in the shape of Stripe API 2026-08-26. */
export type StripeSubscriptionLike = {
  id: string
  status: string
  customer: string | { id: string }
  cancel_at_period_end: boolean
  cancel_at: number | null
  ended_at?: number | null
  metadata?: Record<string, string> | null
  items: { data: Array<{ current_period_end: number; price?: { id: string } | null }> }
}

export type AppSubscriptionStatus = 'free' | 'trialing' | 'active' | 'canceled' | 'expired'

export type BillingUpdate = {
  status: AppSubscriptionStatus
  /** Access runs until here. Null only when the subscription never started. */
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  /** Set while Stripe is retrying a failed renewal; cleared when one succeeds. */
  paymentFailing: boolean
  providerCustomerId: string
  providerSubscriptionId: string
  priceId: string | null
}

const at = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : null)

/**
 * Stripe → app status.
 *
 * - `active`, `trialing`: paid access to the period end. A Stripe trial only
 *   exists here to carry over what was left of the app's own seven days, so to
 *   the member it is the same thing as being subscribed.
 * - `past_due`: still access. Stripe is retrying the card; cutting a member off
 *   on the first failed attempt punishes an expired card, not a decision.
 * - cancel at period end (or a scheduled `cancel_at`): `canceled` with the
 *   period end kept, which `accessFrom` reads as "ending" until then.
 * - `canceled`, `unpaid`, `incomplete_expired`, `paused`: no access.
 * - `incomplete`: the first payment has not gone through yet; no change of
 *   access either way, so it maps to null and the caller leaves the row alone.
 */
export function billingUpdateFrom(subscription: StripeSubscriptionLike): BillingUpdate | null {
  const item = subscription.items.data[0]
  const periodEnd = at(item?.current_period_end)
  const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const base = {
    providerCustomerId: customer,
    providerSubscriptionId: subscription.id,
    priceId: item?.price?.id ?? null,
  }

  switch (subscription.status) {
    case 'incomplete':
      return null
    case 'active':
    case 'trialing':
    case 'past_due': {
      const ending = subscription.cancel_at_period_end || subscription.cancel_at !== null
      const end = subscription.cancel_at !== null ? at(subscription.cancel_at) : periodEnd
      return {
        ...base,
        status: ending ? 'canceled' : 'active',
        currentPeriodEnd: end,
        cancelAtPeriodEnd: ending,
        paymentFailing: subscription.status === 'past_due',
      }
    }
    default:
      // canceled, unpaid, incomplete_expired, paused, and anything new Stripe
      // adds: the member is not paying, so there is no access to keep.
      return {
        ...base,
        status: 'expired',
        currentPeriodEnd: at(subscription.ended_at) ?? periodEnd,
        cancelAtPeriodEnd: false,
        paymentFailing: false,
      }
  }
}

/** Which of our users a subscription belongs to, when Stripe can tell us. */
export function userIdFrom(subscription: Pick<StripeSubscriptionLike, 'metadata'>): string | null {
  const id = subscription.metadata?.userId
  return typeof id === 'string' && id.length > 0 ? id : null
}
