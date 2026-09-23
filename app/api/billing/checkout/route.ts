import { NextResponse } from 'next/server'
import { customerIdFor, saveCustomerId } from '@/lib/billing/store'
import { monthlyPriceId, stripe } from '@/lib/billing/stripe'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'

export const dynamic = 'force-dynamic'

/** Stripe only accepts a trial end at least 48 hours away; keep an hour spare. */
const MIN_TRIAL_CARRY_MS = 49 * 3600_000

/**
 * Starts a Stripe Checkout for the monthly plan and answers with its URL.
 *
 * A member still inside the app's own seven free days keeps them: the Stripe
 * subscription starts with a trial that ends when theirs would have, so paying
 * early never costs them the days they were promised.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const api = stripe()
  if (!api) return NextResponse.json({ error: 'Mokėjimai dar neįjungti.' }, { status: 503 })

  try {
    const access = await getAccess(user.id)
    if (access.state === 'active' || access.state === 'ending') {
      return NextResponse.json({ error: 'Prenumerata jau aktyvi. Ją tvarkyti gali profilyje.' }, { status: 409 })
    }

    let customerId = await customerIdFor(user.id)
    if (!customerId) {
      const customer = await api.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      })
      customerId = customer.id
      await saveCustomerId(user.id, customerId)
    }

    const origin = new URL(request.url).origin
    const trialEnd =
      access.state === 'trial' && access.endsAt && new Date(access.endsAt).getTime() - Date.now() > MIN_TRIAL_CARRY_MS
        ? Math.floor(new Date(access.endsAt).getTime() / 1000)
        : undefined

    const session = await api.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: await monthlyPriceId(api), quantity: 1 }],
      subscription_data: {
        metadata: { userId: user.id },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      allow_promotion_codes: true,
      locale: 'lt',
      success_url: `${origin}/profilis?billing=success&session_id={CHECKOUT_SESSION_ID}#prenumerata`,
      cancel_url: `${origin}/atrakinti?billing=cancelled`,
    })
    if (!session.url) throw new Error('Checkout returned no URL')
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[api/billing/checkout]', error)
    return NextResponse.json({ error: 'Nepavyko atidaryti apmokėjimo. Bandyk dar kartą.' }, { status: 500 })
  }
}
