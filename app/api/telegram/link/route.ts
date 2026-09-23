import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'
import { createLinkUrl } from '@/lib/telegram'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-action')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  // Alerts carry the full signal, so they belong to the full tier only.
  if (!(await getAccess(user.id)).hasAccess) {
    return NextResponse.json({ error: 'Telegram pranešimai įeina į pilną prieigą.' }, { status: 402 })
  }
  try {
    const url = await createLinkUrl(user.id)
    if (!url) return NextResponse.json({ error: 'Telegram botas šiuo metu nepasiekiamas.' }, { status: 503 })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[api/telegram/link]', error)
    return NextResponse.json({ error: 'Nepavyko sukurti nuorodos.' }, { status: 500 })
  }
}
