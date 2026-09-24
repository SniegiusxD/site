import { NextResponse } from 'next/server'
import { isOwner, setFeedbackStatus } from '@/lib/owner'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Owner only: mark a feedback note handled (or new again). Anyone else gets 404. */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user || !isOwner(user.email)) return NextResponse.json({ error: 'Nerasta.' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' && body.id.length <= 64 ? body.id : null
  const status = body?.status === 'done' || body?.status === 'new' ? body.status : null
  if (!id || !status) return NextResponse.json({ error: 'Netinkama užklausa.' }, { status: 400 })

  try {
    return NextResponse.json({ changed: await setFeedbackStatus(id, status) })
  } catch (error) {
    console.error('[api/owner/feedback]', error)
    return NextResponse.json({ error: 'Nepavyko.' }, { status: 500 })
  }
}
