import { NextResponse } from 'next/server'
import { rateLimitResponse } from '@/lib/rate-limit'
import { parseFeedback, saveFeedback } from '@/lib/feedback'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** A bug report, an idea or a wish from the help page. */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-action')
  if (limited) return limited
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const parsed = parseFeedback(await request.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    if (!(await saveFeedback(user.id, parsed.value))) {
      return NextResponse.json({ error: 'Šiandien jau parašei daug žinučių. Pabandyk rytoj.' }, { status: 429 })
    }
    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error('[api/feedback]', error)
    return NextResponse.json({ error: 'Nepavyko išsiųsti. Bandyk dar kartą.' }, { status: 500 })
  }
}
