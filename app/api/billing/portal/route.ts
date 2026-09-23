import { NextResponse } from 'next/server'
import { customerIdFor } from '@/lib/billing/store'
import { portalConfigurationId, stripe } from '@/lib/billing/stripe'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * Opens Stripe's customer portal: change the card, download invoices, cancel
 * at the end of the paid period. Returns its URL; the page redirects.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const api = stripe()
  if (!api) return NextResponse.json({ error: 'Mokėjimai dar neįjungti.' }, { status: 503 })

  try {
    const customerId = await customerIdFor(user.id)
    if (!customerId) return NextResponse.json({ error: 'Prenumeratos dar nėra.' }, { status: 404 })

    const session = await api.billingPortal.sessions.create({
      customer: customerId,
      configuration: await portalConfigurationId(api),
      return_url: `${new URL(request.url).origin}/profilis?billing=portal#prenumerata`,
      locale: 'lt',
    })
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[api/billing/portal]', error)
    return NextResponse.json({ error: 'Nepavyko atidaryti prenumeratos valdymo.' }, { status: 500 })
  }
}
