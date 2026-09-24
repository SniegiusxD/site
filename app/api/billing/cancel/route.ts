import { NextResponse } from 'next/server'
import { billingState, subscriptionIdFor } from '@/lib/billing/store'
import { CANCEL_REASONS } from '@/lib/billing/cancel-reasons'
import { stripe } from '@/lib/billing/stripe'
import { syncSubscription } from '@/lib/billing/sync'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Cancel at the end of the paid period, or take that back. Done here rather
 * than only in Stripe's portal so leaving is one screen with the end date on
 * it. The reason is optional and goes to Stripe's own cancellation feedback.
 * The webhook will report the same change; syncing now just shows it at once.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const api = stripe()
  if (!api) return NextResponse.json({ error: 'Mokėjimai dar neįjungti.' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const action = body?.action === 'resume' ? 'resume' : body?.action === 'cancel' ? 'cancel' : null
  if (!action) return NextResponse.json({ error: 'Nežinomas veiksmas.' }, { status: 400 })
  const reason = CANCEL_REASONS.find((entry) => entry.key === body?.reason)

  try {
    const subscriptionId = await subscriptionIdFor(user.id)
    if (!subscriptionId) return NextResponse.json({ error: 'Aktyvios prenumeratos nėra.' }, { status: 404 })

    await api.subscriptions.update(
      subscriptionId,
      action === 'cancel'
        ? {
            cancel_at_period_end: true,
            ...(reason ? { cancellation_details: { feedback: reason.stripe } } : {}),
          }
        : { cancel_at_period_end: false },
    )
    await syncSubscription(api, subscriptionId, user.id)
    return NextResponse.json({ billing: await billingState(user.id) })
  } catch (error) {
    console.error('[api/billing/cancel]', error)
    return NextResponse.json(
      { error: action === 'cancel' ? 'Nepavyko atšaukti. Bandyk dar kartą arba atšauk per sąskaitų puslapį.' : 'Nepavyko atnaujinti prenumeratos.' },
      { status: 502 },
    )
  }
}
