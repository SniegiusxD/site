import type Stripe from 'stripe'
import { billingUpdateFrom, type StripeSubscriptionLike, userIdFrom } from './status'
import { applyBillingUpdate, userIdForCustomer } from './store'

/**
 * Reads a subscription from Stripe and writes its state to our row.
 *
 * Always re-reads rather than trusting an event's payload: Stripe delivers
 * events at least once and not necessarily in order, so an old
 * `customer.subscription.updated` arriving late must not overwrite a newer
 * cancellation. The subscription as Stripe holds it now is the only answer.
 */
export async function syncSubscription(
  api: Stripe,
  subscriptionId: string,
  knownUserId: string | null = null,
): Promise<{ userId: string | null; applied: boolean }> {
  const subscription = (await api.subscriptions.retrieve(subscriptionId)) as unknown as StripeSubscriptionLike
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const userId = knownUserId ?? userIdFrom(subscription) ?? (await userIdForCustomer(customerId))
  if (!userId) return { userId: null, applied: false }
  const update = billingUpdateFrom(subscription)
  if (!update) return { userId, applied: false }
  await applyBillingUpdate(userId, update)
  return { userId, applied: true }
}
