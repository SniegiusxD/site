import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { deleteTelegramPreset, loadTelegramState, saveTelegramPreset, saveTelegramSettings } from '@/lib/telegram'
import { parseTelegramSettings } from '@/lib/telegram-settings'

export const dynamic = 'force-dynamic'

/**
 * Save the current alert rules under a name, or apply a saved one. Applying
 * writes into the same columns the bot already reads, so a preset needs no
 * change on the sending side.
 */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 40) : ''
  const parsed = parseTelegramSettings(body.settings)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    if (body.apply === true) {
      await saveTelegramSettings(user.id, parsed.value)
    } else {
      if (!name) return NextResponse.json({ error: 'Įrašyk pavadinimą.' }, { status: 400 })
      await saveTelegramPreset(user.id, name, parsed.value)
    }
    return NextResponse.json(await loadTelegramState(user.id))
  } catch (error) {
    console.error('[api/telegram/presets POST]', error)
    return NextResponse.json({ error: 'Nepavyko išsaugoti.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Trūksta rinkinio.' }, { status: 400 })

  try {
    await deleteTelegramPreset(user.id, id)
    return NextResponse.json(await loadTelegramState(user.id))
  } catch (error) {
    console.error('[api/telegram/presets DELETE]', error)
    return NextResponse.json({ error: 'Nepavyko ištrinti.' }, { status: 500 })
  }
}
