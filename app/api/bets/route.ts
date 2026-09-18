import { NextResponse } from 'next/server'
import { parseBetInput } from '@/lib/bet-input'
import { headers } from 'next/headers'
import { and, desc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db, pool } from '@/lib/db'
import { userBet } from '@/lib/db/schema'
import { ensureBetsSchema } from '@/lib/db/ensure-bets-schema'
import { applyMemberOutcomes, isCanonicalOutcome } from '@/lib/member-outcomes'
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
    settledAtIso: row.settledAt ? row.settledAt.toISOString() : null,
    entryFairProb: row.entryFairProb,
    closingFairProb: row.closingFairProb,
    eventKey: row.eventKey,
    shownOdds: row.shownOdds ?? null,
    shownStake: row.shownStake ?? null,
    placement: (row.placement as 'accepted' | 'limited' | 'rejected') ?? 'accepted',
    delaySeconds: row.delaySeconds ?? null,
    canonicalOutcome: isCanonicalOutcome(row.canonicalOutcome) ? row.canonicalOutcome : null,
    homeScore: row.homeScore ?? null,
    awayScore: row.awayScore ?? null,
    resultSource: row.resultSource ?? null,
  }
}

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) return null
  return session.user.id
}

export async function GET() {
  const userId = await requireSession()
  if (!userId) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  try {
    await ensureBetsSchema()
    // Canonical results first: the site's own grader then only sees bets the
    // aggregator has not graded yet.
    await applyMemberOutcomes(pool, userId)
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

    const parsed = parseBetInput(body)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const row = {
      id: `bet-${crypto.randomUUID()}`,
      userId,
      ...parsed.value,
      status: 'laukia',
      profit: null,
      placedAt: new Date(),
      settledAt: null,
      closingFairProb: null,
      closingCapturedAt: null,
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
