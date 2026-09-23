import { NextResponse } from 'next/server'
import { billingState, subscriptionIdFor } from '@/lib/billing/store'
import { stripe } from '@/lib/billing/stripe'
import { syncSubscription } from '@/lib/billing/sync'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Called by the profile when a member returns from Checkout or the portal. It does not wait
 * for the webhook: the session is read straight from Stripe, checked to belong
 * to this member, and its subscription written at once. The webhook then
 * finds nothing left to change. Either path alone is enough; together a slow
 * or missing webhook never leaves someone who has paid looking at the free
 * board.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const api = stripe()
  if (!api) return NextResponse.json({ error: 'Mokėjimai dar neįjungti.' }, { status: 503 })

  const body = await request.json().catch(() => ({}))
  const sessionId = typeof body.sessionId === 'string' && body.sessionId.startsWith('cs_') ? body.sessionId : null

  // Back from the customer portal: no session to read, so re-read the
  // subscription we already hold. A cancellation made there shows at once.
  if (!sessionId) {
    try {
      const subscriptionId = await subscriptionIdFor(user.id)
      if (subscriptionId) await syncSubscription(api, subscriptionId, user.id)
      return NextResponse.json({ pending: false, billing: await billingState(user.id) })
    } catch (error) {
      console.error('[api/billing/sync portal]', error)
      return NextResponse.json({ error: 'Nepavyko atnaujinti prenumeratos.' }, { status: 500 })
    }
  }

  try {
    const session = await api.checkout.sessions.retrieve(sessionId)
    // Someone else's session id must not attach their subscription here.
    if (session.client_reference_id !== user.id) {
      return NextResponse.json({ error: 'Šis apmokėjimas ne tavo paskyrai.' }, { status: 403 })
    }
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
    if (session.status !== 'complete' || !subscriptionId) {
      return NextResponse.json({ pending: true, billing: await billingState(user.id) })
    }
    await syncSubscription(api, subscriptionId, user.id)
    return NextResponse.json({ pending: false, billing: await billingState(user.id) })
  } catch (error) {
    console.error('[api/billing/sync]', error)
    return NextResponse.json({ error: 'Nepavyko patikrinti apmokėjimo.' }, { status: 500 })
  }
}
