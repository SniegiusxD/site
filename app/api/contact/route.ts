import { NextResponse } from 'next/server'
import { parseContact, saveContact } from '@/lib/feedback'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** The public contact form: no account needed, a few per visitor, a daily cap for all. */
export async function POST(request: Request) {
  const limited = await rateLimitResponse(request, 'expensive-action')
  if (limited) return limited
  const parsed = parseContact(await request.json().catch(() => null))
  // A trapped bot gets the same answer as a person, so it learns nothing.
  if (!parsed.ok) return parsed.spam ? NextResponse.json({ saved: true }) : NextResponse.json({ error: parsed.error }, { status: 400 })
  try {
    if (!(await saveContact(parsed.value))) {
      return NextResponse.json({ error: 'Šiandien žinučių labai daug. Pabandyk rytoj.' }, { status: 429 })
    }
    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error('[api/contact]', error)
    return NextResponse.json({ error: 'Nepavyko išsiųsti. Bandyk dar kartą.' }, { status: 500 })
  }
}
