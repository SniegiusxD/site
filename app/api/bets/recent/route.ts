import { NextResponse } from 'next/server'
import { loadRecentBets } from '@/lib/recent-bets'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    return NextResponse.json({ bets: await loadRecentBets(user.id) })
  } catch (error) {
    console.error('[api/bets/recent]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti statymų.' }, { status: 500 })
  }
}
