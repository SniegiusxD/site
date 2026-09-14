import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { createLinkUrl } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    const url = await createLinkUrl(user.id)
    if (!url) return NextResponse.json({ error: 'Telegram botas šiuo metu nepasiekiamas.' }, { status: 503 })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('[api/telegram/link]', error)
    return NextResponse.json({ error: 'Nepavyko sukurti nuorodos.' }, { status: 500 })
  }
}
