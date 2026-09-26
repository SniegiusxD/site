import { NextResponse } from 'next/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import { parsePauseDays } from '@/lib/self-pause'
import { startPause } from '@/lib/self-pause-store'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Starts a break the member chose for themselves. It cannot be cut short. */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-action')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const days = parsePauseDays(body?.days)
  if (!days) return NextResponse.json({ error: 'Pasirink 1, 7 arba 30 dienų.' }, { status: 400 })

  try {
    const until = await startPause(user.id, days)
    return NextResponse.json({ pausedUntil: until.toISOString() })
  } catch (error) {
    console.error('[api/pause]', error)
    return NextResponse.json({ error: 'Nepavyko įjungti pertraukos. Bandyk dar kartą.' }, { status: 500 })
  }
}
