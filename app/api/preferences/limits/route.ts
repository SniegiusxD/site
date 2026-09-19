import { NextResponse } from 'next/server'
import { listBookLimitEvents } from '@/lib/account-store'
import { pool } from '@/lib/db'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** The member's bookmaker-limit history, and how often a book cut a stake. */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })
  try {
    const events = await listBookLimitEvents(user.id)
    const { rows } = await pool.query<{ bookmaker: string; count: string }>(
      `SELECT bookmaker, COUNT(*)::text AS count FROM user_bet
        WHERE "userId" = $1 AND placement = 'limited' GROUP BY bookmaker`,
      [user.id],
    )
    return NextResponse.json({
      events,
      cuts: Object.fromEntries(rows.map((row) => [row.bookmaker, Number(row.count)])),
    })
  } catch (error) {
    console.error('[api/preferences/limits]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti limitų istorijos.' }, { status: 500 })
  }
}
