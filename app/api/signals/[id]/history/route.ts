import { NextResponse } from 'next/server'
import { loadSeries } from '@/lib/price-history'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** Everything we have recorded for one signal's prices, oldest first. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const { id } = await params
  if (!id || id.length > 64) return NextResponse.json({ error: 'Nežinomas signalas.' }, { status: 400 })

  try {
    // History belongs to the full board; the free tier does not see these signals.
    const access = await getAccess(user.id)
    if (!access.hasAccess) return NextResponse.json({ points: [] }, { headers: { 'Cache-Control': 'private, no-store' } })
    const points = await loadSeries(id)
    return NextResponse.json({ points }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[api/signals/history]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti kainų istorijos.' }, { status: 500 })
  }
}
