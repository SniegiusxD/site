import { NextResponse } from 'next/server'
import { loadAccount, saveSettings } from '@/lib/account-store'
import { parseSettings } from '@/lib/preferences'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = parseSettings(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    await saveSettings(user.id, parsed.value)
    return NextResponse.json(await loadAccount(user.id))
  } catch (error) {
    console.error('[api/preferences]', error)
    return NextResponse.json({ error: 'Nepavyko išsaugoti. Bandyk dar kartą.' }, { status: 500 })
  }
}
