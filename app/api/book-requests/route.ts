import { NextResponse } from 'next/server'
import { parseBookRequest, saveBookRequest } from '@/lib/book-requests'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** A member asks for a bookmaker we do not cover. Counted, never acted on automatically. */
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const parsed = parseBookRequest(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const saved = await saveBookRequest(user.id, parsed.value)
    if (!saved) return NextResponse.json({ error: 'Šiandien jau pasiūlei kelias kontoras. Pabandyk rytoj.' }, { status: 429 })
    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error('[api/book-requests]', error)
    return NextResponse.json({ error: 'Nepavyko išsaugoti. Bandyk dar kartą.' }, { status: 500 })
  }
}
