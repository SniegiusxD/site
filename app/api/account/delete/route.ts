import { NextResponse } from 'next/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import { deleteAccount } from '@/lib/account-data'
import { subscriptionIdFor } from '@/lib/billing/store'
import { stripe } from '@/lib/billing/stripe'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Subscription states in which Stripe would still charge the card. */
const CHARGING = new Set(['active', 'trialing', 'past_due', 'unpaid', 'incomplete'])

/**
 * Deletes the signed-in member for good. The member types their email to
 * confirm. A live Stripe subscription is cancelled first and immediately —
 * deleting the account while the card keeps being charged would be the worst
 * outcome — and if that cancellation fails, nothing is deleted.
 *
 * The Stripe customer itself is kept: its invoices are accounting records the
 * business must retain, and they hold no betting data.
 */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-action')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const confirm = typeof body.confirm === 'string' ? body.confirm.trim().toLowerCase() : ''
  if (!confirm || confirm !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Įrašyk savo el. pašto adresą, kad patvirtintum.' }, { status: 400 })
  }

  let cancelled = false
  try {
    const api = stripe()
    const subscriptionId = await subscriptionIdFor(user.id)
    if (api && subscriptionId) {
      const subscription = await api.subscriptions.retrieve(subscriptionId)
      if (CHARGING.has(subscription.status)) {
        await api.subscriptions.cancel(subscriptionId)
        cancelled = true
      }
    }
  } catch (error) {
    console.error('[api/account/delete stripe]', error)
    return NextResponse.json(
      { error: 'Nepavyko atšaukti prenumeratos, todėl paskyra neištrinta. Bandyk dar kartą arba parašyk mums.' },
      { status: 502 },
    )
  }

  try {
    await deleteAccount(user.id, user.email)
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('[api/account/delete]', error)
    return NextResponse.json(
      {
        error: cancelled
          ? 'Prenumerata atšaukta ir daugiau nebus apmokestinta, bet paskyros ištrinti nepavyko. Bandyk dar kartą.'
          : 'Nepavyko ištrinti paskyros. Nieko nepakeista — bandyk dar kartą.',
      },
      { status: 500 },
    )
  }
}
