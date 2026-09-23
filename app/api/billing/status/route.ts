import { NextResponse } from 'next/server'
import { billingState } from '@/lib/billing/store'
import { billingEnabled, testMode } from '@/lib/billing/stripe'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** The member's billing as our database holds it; never calls Stripe. */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    return NextResponse.json({ enabled: billingEnabled(), testMode: testMode(), billing: await billingState(user.id) })
  } catch (error) {
    console.error('[api/billing/status]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti prenumeratos.' }, { status: 500 })
  }
}
