import { NextResponse } from 'next/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import { parseExecutionEvent, recordExecutionEvent } from '@/lib/execution-events'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * One step a member took on a signal: opened the bookmaker or copied the
 * event. Fire-and-forget from the client; a failure here must never get in the
 * way of the bet itself, so every answer is small and nothing is retried.
 */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const event = parseExecutionEvent(await request.json().catch(() => null))
  if (!event) return NextResponse.json({ error: 'Netinkamas įvykis.' }, { status: 400 })

  try {
    const recorded = await recordExecutionEvent(user.id, event)
    return NextResponse.json({ recorded })
  } catch (error) {
    console.error('[api/execution]', error)
    return NextResponse.json({ recorded: false }, { status: 500 })
  }
}
