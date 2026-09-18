import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureBetsSchema } from '@/lib/db/ensure-bets-schema'
import { userBet } from '@/lib/db/schema'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

/** Only a bet the member owns, and only while it is still waiting. */
async function ownPendingBet(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(userBet)
    .where(and(eq(userBet.id, id), eq(userBet.userId, userId)))
    .limit(1)
  return row ?? null
}

/** Correct a bet that was recorded wrong: the odds or the stake. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const odds = body.odds === undefined ? undefined : Number(body.odds)
  const stake = body.stake === undefined ? undefined : Number(body.stake)

  if (odds !== undefined && (!Number.isFinite(odds) || odds <= 1 || odds > 1000)) {
    return NextResponse.json({ error: 'Koeficientas turi būti nuo 1,01 iki 1000.' }, { status: 400 })
  }
  if (stake !== undefined && (!Number.isFinite(stake) || stake <= 0 || stake > 100_000)) {
    return NextResponse.json({ error: 'Suma turi būti nuo 0,01 € iki 100 000 €.' }, { status: 400 })
  }
  if (odds === undefined && stake === undefined) {
    return NextResponse.json({ error: 'Nėra ką keisti.' }, { status: 400 })
  }

  try {
    await ensureBetsSchema()
    const row = await ownPendingBet(id, user.id)
    if (!row) return NextResponse.json({ error: 'Statymas nerastas.' }, { status: 404 })
    // A settled bet's profit was computed from these numbers; changing them
    // would quietly rewrite history.
    if (row.status !== 'laukia') {
      return NextResponse.json({ error: 'Užbaigto statymo keisti nebegalima.' }, { status: 409 })
    }

    await db
      .update(userBet)
      .set({ ...(odds === undefined ? {} : { odds }), ...(stake === undefined ? {} : { stake }) })
      .where(and(eq(userBet.id, id), eq(userBet.userId, user.id)))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/bets PATCH]', error)
    return NextResponse.json({ error: 'Nepavyko išsaugoti.' }, { status: 500 })
  }
}

/** Remove a bet recorded by mistake. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const { id } = await params
  try {
    await ensureBetsSchema()
    const row = await ownPendingBet(id, user.id)
    if (!row) return NextResponse.json({ error: 'Statymas nerastas.' }, { status: 404 })
    await db.delete(userBet).where(and(eq(userBet.id, id), eq(userBet.userId, user.id)))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/bets DELETE]', error)
    return NextResponse.json({ error: 'Nepavyko ištrinti.' }, { status: 500 })
  }
}
