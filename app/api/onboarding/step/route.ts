import { NextResponse } from 'next/server'
import { parseFunnelEvent, recordFunnelStep } from '@/lib/onboarding-funnel'
import { rateLimitResponse } from '@/lib/rate-limit'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** One onboarding step reached, by an anonymous per-browser id. Never fails the flow. */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  const event = parseFunnelEvent(await request.json().catch(() => null))
  if (!event) return NextResponse.json({ error: 'Netinkamas įvykis.' }, { status: 400 })
  try {
    await recordFunnelStep(event.visitor, event.step)
  } catch (error) {
    console.error('[api/onboarding/step]', error)
  }
  return new NextResponse(null, { status: 204 })
}
