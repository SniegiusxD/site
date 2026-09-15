import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { parseMonth, parsePeriod, parseSort } from '@/lib/top'
import { loadTopBoard, loadTopProfile } from '@/lib/top-store'

export const dynamic = 'force-dynamic'

// Member ids stay on the server; the page only needs names and numbers.
const withoutId = <T extends { userId: string }>({ userId: _userId, ...rest }: T) => rest

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const params = new URL(request.url).searchParams
  const period = parsePeriod(params.get('period'))
  const sort = parseSort(params.get('sort'))
  const month = parseMonth(params.get('month'), new Date())

  try {
    const [board, profile] = await Promise.all([loadTopBoard(user.id, period, month, sort), loadTopProfile(user.id)])
    return NextResponse.json({
      period,
      sort,
      month,
      profile,
      ranked: board.ranked.map(withoutId),
      tooFew: board.tooFew.map(withoutId),
      you: board.you ? withoutId(board.you) : null,
    })
  } catch (error) {
    console.error('[api/top GET]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti topo.' }, { status: 500 })
  }
}
