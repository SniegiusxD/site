import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { sendTestMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    const result = await sendTestMessage(user.id)
    if (result === 'not-connected') return NextResponse.json({ error: 'Pirma prijunk Telegram.' }, { status: 409 })
    if (result === 'failed') return NextResponse.json({ error: 'Telegram pranešimo išsiųsti nepavyko.' }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/telegram/test]', error)
    return NextResponse.json({ error: 'Nepavyko išsiųsti.' }, { status: 500 })
  }
}
