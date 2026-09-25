import { NextResponse } from 'next/server'
import { freeBoard } from '@/lib/free-tier'
import { loadLiveBoard } from '@/lib/live-signals'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'
import { rateLimitResponse } from '@/lib/rate-limit'
import { loadPause } from '@/lib/self-pause-store'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  try {
    const [access, board, paused] = await Promise.all([getAccess(user.id), loadLiveBoard(), loadPause(user.id)])
    // During a member's own break the server sends no signals at all.
    if (paused) {
      return NextResponse.json(
        { error: 'Pertrauka: signalai grįš pasibaigus pertraukai.', pausedUntil: paused.toISOString() },
        { status: 423, headers: { 'Cache-Control': 'private, no-store' } },
      )
    }
    return NextResponse.json(access.hasAccess ? board : freeBoard(board), {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('[api/live]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti signalų. Bandyk dar kartą.' }, { status: 500 })
  }
}
