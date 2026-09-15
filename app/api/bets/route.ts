import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { and, desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db, pool } from '@/lib/db'
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
    placedAtIso: row.placedAt.toISOString(),
    profit: row.profit,
    marketType: row.marketType,
    pickName: row.pickName ?? undefined,
    line: row.line ?? undefined,
    startsAt: row.startsAt?.toISOString(),
    entryFairProb: row.entryFairProb,
    closingFairProb: row.closingFairProb,
    eventKey: row.eventKey,
  }
}

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return null
  return session.user.id
}

/** Copy closing prices the VM published onto this member's bets, once each. */
async function backfillClosings(userId: string) {
  try {
    await pool.query(
      `UPDATE user_bet ub
          SET "closingFairProb" = s.closing_fair_prob, "closingCapturedAt" = s.closing_captured_at
         FROM live_signal s
        WHERE ub."userId" = $1 AND ub."signalId" = s.id
          AND ub."closingFairProb" IS NULL AND s.closing_fair_prob IS NOT NULL`,
      [userId],
    )
  } catch (error) {
    // A fresh database may not have live_signal or its closing columns yet.
    const code = (error as { code?: string }).code
    if (code !== '42P01' && code !== '42703') throw error
  }
}

export async function GET() {
  const userId = await requireSession()
  if (!userId) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  try {
    await ensureBetsSchema()
    await backfillClosings(userId)
    await settlePendingBets({ userId })

    const rows = await db.select().from(userBet).where(eq(userBet.userId, userId)).orderBy(desc(userBet.placedAt))
    return NextResponse.json({ bets: rows.map(rowToActiveBet) })
  } catch (error) {
    console.error('[api/bets GET]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti statymų.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = await requireSession()
  if (!userId) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  try {
    await ensureBetsSchema()
    const body = await req.json().catch(() => ({}))

    const entryFairProb = Number(body.entryFairProb)
    const row = {
      id: `bet-${crypto.randomUUID()}`,
      userId,
      signalId: typeof body.signalId === 'string' ? body.signalId.slice(0, 64) : null,
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
      entryFairProb: Number.isFinite(entryFairProb) && entryFairProb > 0 && entryFairProb < 1 ? entryFairProb : null,
      eventKey: typeof body.eventKey === 'string' ? body.eventKey.slice(0, 64) : null,
      closingFairProb: null,
      closingCapturedAt: null,
    }

    if (!row.match || !Number.isFinite(row.odds) || row.odds <= 1 || !Number.isFinite(row.stake) || row.stake <= 0) {
      return NextResponse.json({ error: 'Neteisingi statymo duomenys.' }, { status: 400 })
    }

    if (row.signalId) {
      const existing = await db
        .select({ id: userBet.id })
        .from(userBet)
        .where(and(eq(userBet.userId, userId), eq(userBet.signalId, row.signalId), eq(userBet.bookmaker, row.bookmaker)))
        .limit(1)
      if (existing.length) return NextResponse.json({ error: 'Šis statymas jau pažymėtas.' }, { status: 409 })
    }

    await db.insert(userBet).values(row)
    return NextResponse.json({ bet: rowToActiveBet(row as typeof userBet.$inferSelect) })
  } catch (error) {
    console.error('[api/bets POST]', error)
    return NextResponse.json({ error: 'Nepavyko pažymėti statymo.' }, { status: 500 })
  }
}
