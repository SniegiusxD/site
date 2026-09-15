import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { parseTopProfile } from '@/lib/top'
import { saveTopProfile } from '@/lib/top-store'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const parsed = parseTopProfile(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const result = await saveTopProfile(user.id, parsed.value)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 })
    return NextResponse.json({ profile: result.profile })
  } catch (error) {
    console.error('[api/top/profile PUT]', error)
    return NextResponse.json({ error: 'Nepavyko išsaugoti. Bandyk dar kartą.' }, { status: 500 })
  }
}
