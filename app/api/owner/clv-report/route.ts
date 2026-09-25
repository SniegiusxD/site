import { NextResponse } from 'next/server'
import { renderClvReport } from '@/lib/clv-report'
import { isOwner } from '@/lib/owner'
import { loadPastSignals } from '@/lib/public-results-store'
import { rateLimitResponse } from '@/lib/rate-limit'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Owner-only: the CLV report as a markdown file, from the same record as /rezultatai. */
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || !isOwner(user.email)) return NextResponse.json({ error: 'Nerasta.' }, { status: 404 })
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  const signals = await loadPastSignals()
  if (!signals) return NextResponse.json({ error: 'Nepavyko įkelti įrašo.' }, { status: 500 })
  const now = new Date()
  return new NextResponse(renderClvReport(signals, now), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="CLV_WEEKLY_${now.toISOString().slice(0, 10)}.md"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
