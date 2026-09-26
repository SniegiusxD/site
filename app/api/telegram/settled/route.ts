import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { loadTelegramState, saveNotifySettled } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

/** Settlement messages in Telegram: on or off. */
export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (typeof body?.on !== 'boolean') return NextResponse.json({ error: 'Netinkama reikšmė.' }, { status: 400 })
  try {
    await saveNotifySettled(user.id, body.on)
    return NextResponse.json(await loadTelegramState(user.id))
  } catch (error) {
    console.error('[api/telegram/settled]', error)
    return NextResponse.json({ error: 'Nepavyko išsaugoti.' }, { status: 500 })
  }
}
