import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { disconnectTelegram, loadTelegramState, saveTelegramSettings } from '@/lib/telegram'
import { parseTelegramSettings } from '@/lib/telegram-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    return NextResponse.json(await loadTelegramState(user.id))
  } catch (error) {
    console.error('[api/telegram GET]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti Telegram nustatymų.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  const parsed = parseTelegramSettings(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  try {
    await saveTelegramSettings(user.id, parsed.value)
    return NextResponse.json(await loadTelegramState(user.id))
  } catch (error) {
    console.error('[api/telegram PUT]', error)
    return NextResponse.json({ error: 'Nepavyko išsaugoti.' }, { status: 500 })
  }
}

export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    await disconnectTelegram(user.id)
    return NextResponse.json(await loadTelegramState(user.id))
  } catch (error) {
    console.error('[api/telegram DELETE]', error)
    return NextResponse.json({ error: 'Nepavyko atjungti.' }, { status: 500 })
  }
}
