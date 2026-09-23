import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { claimEvent, releaseEvent } from '@/lib/billing/store'
import { stripe } from '@/lib/billing/stripe'
import { syncSubscription } from '@/lib/billing/sync'

export const dynamic = 'force-dynamic'

/** The subscription an event is about, wherever this event type keeps it. */
function subscriptionIdOf(event: Stripe.Event): string | null {
  const object = event.data.object as unknown as Record<string, unknown>
  if (event.type.startsWith('customer.subscription.')) return (object.id as string) ?? null
  if (event.type === 'checkout.session.completed') {
    const sub = object.subscription as string | { id: string } | null
    return typeof sub === 'string' ? sub : (sub?.id ?? null)
  }
  if (event.type.startsWith('invoice.')) {
    // API 2026-08-26: an invoice links its subscription under `parent`.
    const parent = object.parent as { subscription_details?: { subscription?: string | { id: string } } } | null
    const sub = parent?.subscription_details?.subscription
    return typeof sub === 'string' ? sub : (sub?.id ?? null)
  }
  return null
}

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
])

/**
 * Stripe's events, verified by signature and applied at most once each.
 * Every handled event resolves to "read that subscription from Stripe and
 * write its current state", so order and duplicates cannot corrupt anything.
 */
export async function POST(request: Request) {
  const api = stripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  if (!api || !secret) return NextResponse.json({ error: 'billing not configured' }, { status: 503 })

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = api.webhooks.constructEvent(await request.text(), signature, secret)
  } catch {
    // A forged or corrupted request: say nothing about why.
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true, ignored: event.type })

  const object = event.data.object as unknown as Record<string, unknown>
  const knownUserId =
    event.type === 'checkout.session.completed' && typeof object.client_reference_id === 'string'
      ? object.client_reference_id
      : null

  if (!(await claimEvent(event.id, event.type, knownUserId))) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    const subscriptionId = subscriptionIdOf(event)
    const result = subscriptionId ? await syncSubscription(api, subscriptionId, knownUserId) : null
    return NextResponse.json({ received: true, applied: result?.applied ?? false })
  } catch (error) {
    // Give the claim back so Stripe's retry can run the handler again.
    await releaseEvent(event.id).catch(() => {})
    console.error('[api/billing/webhook]', event.type, error)
    return NextResponse.json({ error: 'handler failed' }, { status: 500 })
  }
}
