import { NextResponse } from 'next/server'
import { loadLiveBoard } from '@/lib/live-signals'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  try {
    const access = await getAccess(user.id)
    if (!access.hasAccess) {
      return NextResponse.json({ error: 'Bandymas baigėsi.', access }, { status: 402 })
    }
    const board = await loadLiveBoard()
    return NextResponse.json(board, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('[api/live]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti signalų. Bandyk dar kartą.' }, { status: 500 })
  }
}
