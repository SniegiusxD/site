import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userBet } from '@/lib/db/schema'
import { ensureBetsSchema } from '@/lib/db/ensure-bets-schema'
import { settlePendingBets } from '@/lib/settle-bets'
import type { ActiveBet, BetStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

function formatPlacedAt(d: Date): string {
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'Ką tik'
  if (diff < 3_600_000) return `prieš ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `prieš ${Math.floor(diff / 3_600_000)} val`
  return d.toLocaleDateString('lt-LT')
}

function rowToActiveBet(row: typeof userBet.$inferSelect): ActiveBet {
  return {
    id: row.id,
    signalId: row.signalId ?? '',
    sport: row.sport as ActiveBet['sport'],
    match: row.match,
    betDescription: row.betDescription,
    bookmaker: row.bookmaker as ActiveBet['bookmaker'],
    odds: row.odds,
    stake: row.stake,
    status: row.status as BetStatus,
    placedAt: formatPlacedAt(row.placedAt),
    profit: row.profit,
    marketType: row.marketType,
    pickName: row.pickName ?? undefined,
    line: row.line ?? undefined,
    startsAt: row.startsAt?.toISOString(),
  }
}

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return null
  return session.user.id
}

export async function GET() {
  const userId = await requireSession()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureBetsSchema()
    await settlePendingBets({ userId })

    const rows = await db
      .select()
      .from(userBet)
      .where(eq(userBet.userId, userId))
      .orderBy(desc(userBet.placedAt))

    return NextResponse.json({
      bets: rows.map(rowToActiveBet),
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load bets' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const userId = await requireSession()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureBetsSchema()
    const body = await req.json()

    const id = `bet-${crypto.randomUUID()}`
    const row = {
      id,
      userId,
      signalId: body.signalId ?? null,
      sport: String(body.sport ?? 'OTHER'),
      match: String(body.match ?? ''),
      betDescription: String(body.betDescription ?? ''),
      bookmaker: String(body.bookmaker ?? '7BET'),
      odds: Number(body.odds),
      stake: Number(body.stake),
      marketType: String(body.marketType ?? 'moneyline'),
      pickName: body.pickName ?? null,
      line: body.line != null ? Number(body.line) : null,
      homeName: body.homeName ?? null,
      awayName: body.awayName ?? null,
      gameKey: body.gameKey ?? null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      status: 'laukia',
      profit: null,
      placedAt: new Date(),
      settledAt: null,
    }

    if (!row.match || !Number.isFinite(row.odds) || !Number.isFinite(row.stake)) {
      return NextResponse.json({ error: 'Invalid bet payload' }, { status: 400 })
    }

    await db.insert(userBet).values(row)

    return NextResponse.json({ bet: rowToActiveBet(row as typeof userBet.$inferSelect) })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to place bet' },
      { status: 500 },
    )
  }
}
