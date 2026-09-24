import { NextResponse } from 'next/server'
import { searchOwnerMembers } from '@/lib/admin-actions'
import { isOwner } from '@/lib/owner'
import { rateLimitResponse } from '@/lib/rate-limit'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Owner-only member search. Returns operational state, never payment-card data. */
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || !isOwner(user.email)) return NextResponse.json({ error: 'Nerasta.' }, { status: 404 })
  const limited = await rateLimitResponse(request, 'expensive-read')
  if (limited) return limited
  try {
    const q = new URL(request.url).searchParams.get('q') ?? ''
    return NextResponse.json({ members: await searchOwnerMembers(q) })
  } catch (error) {
    console.error('[api/owner/users]', error)
    return NextResponse.json({ error: 'Nepavyko gauti narių.' }, { status: 500 })
  }
}
