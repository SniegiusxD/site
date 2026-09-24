import { NextResponse } from 'next/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import { getSessionUser } from '@/lib/session'
import { loadTrialRecap } from '@/lib/trial-recap'

export const dynamic = 'force-dynamic'

/** The member's own trial summary, once the trial is over. */
export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    return NextResponse.json({ recap: await loadTrialRecap(user.id) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[api/trial/recap]', error)
    return NextResponse.json({ recap: null }, { status: 500 })
  }
}
