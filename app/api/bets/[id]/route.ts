import { and, desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureBetsSchema } from '@/lib/db/ensure-bets-schema'
import { betEdit, userBet } from '@/lib/db/schema'
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

/** The corrections made to this bet, newest first. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const { id } = await params
  try {
    await ensureBetsSchema()
    const rows = await db
      .select()
      .from(betEdit)
      .where(and(eq(betEdit.betId, id), eq(betEdit.userId, user.id)))
      .orderBy(desc(betEdit.at))
      .limit(20)
    return NextResponse.json({
      edits: rows.map((row) => ({ field: row.field, from: row.fromValue, to: row.toValue, at: row.at.toISOString() })),
    })
  } catch (error) {
    console.error('[api/bets edits]', error)
    return NextResponse.json({ error: 'Nepavyko įkelti pakeitimų.' }, { status: 500 })
  }
}

/** What a member may set a result to by hand, and what it pays. */
const MANUAL_STATUS = {
  laimeta: (odds: number, stake: number) => stake * (odds - 1),
  pralaimeta: (_odds: number, stake: number) => -stake,
  grazinta: () => 0,
  neisspresta: () => 0,
  laukia: () => 0,
} as const

type ManualStatus = keyof typeof MANUAL_STATUS

const isManualStatus = (value: unknown): value is ManualStatus =>
  typeof value === 'string' && value in MANUAL_STATUS

/** The member's own labels: at most six, short, lower case, no blanks. */
function parseTags(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw)) return []
  const cleaned: string[] = []
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const tag = entry.trim().toLowerCase().slice(0, 24)
    if (tag && !cleaned.includes(tag)) cleaned.push(tag)
  }
  return cleaned.slice(0, 6)
}

/** Correct a bet that was recorded wrong: the odds or the stake. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Prisijunk iš naujo.' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const odds = body.odds === undefined ? undefined : Number(body.odds)
  const stake = body.stake === undefined ? undefined : Number(body.stake)
  // A note is the member's own text: trimmed, bounded, and clearable.
  const note =
    body.note === undefined ? undefined : typeof body.note === 'string' ? body.note.trim().slice(0, 500) || null : null

  // Tags are the member's own labels: at most six, short, lower case, no blanks.
  const tags = parseTags(body.tags)
  // Automatic settlement is right about nine times in ten; the tenth is the
  // member's to correct, and the correction is recorded like any other edit.
  const status: ManualStatus | null | undefined =
    body.status === undefined ? undefined : isManualStatus(body.status) ? body.status : null
  if (status === null) {
    return NextResponse.json({ error: 'Nežinomas rezultatas.' }, { status: 400 })
  }

  if (odds !== undefined && (!Number.isFinite(odds) || odds <= 1 || odds > 1000)) {
    return NextResponse.json({ error: 'Koeficientas turi būti nuo 1,01 iki 1000.' }, { status: 400 })
  }
  if (stake !== undefined && (!Number.isFinite(stake) || stake <= 0 || stake > 100_000)) {
    return NextResponse.json({ error: 'Suma turi būti nuo 0,01 € iki 100 000 €.' }, { status: 400 })
  }
  if (odds === undefined && stake === undefined && note === undefined && tags === undefined && status === undefined) {
    return NextResponse.json({ error: 'Nėra ką keisti.' }, { status: 400 })
  }

  try {
    await ensureBetsSchema()
    const row = await ownPendingBet(id, user.id)
    if (!row) return NextResponse.json({ error: 'Statymas nerastas.' }, { status: 404 })
    // A settled bet's profit was computed from these numbers; changing them
    // would quietly rewrite history.
    if (row.status !== 'laukia' && (odds !== undefined || stake !== undefined)) {
      return NextResponse.json({ error: 'Užbaigto statymo sumos ir koeficiento keisti nebegalima.' }, { status: 409 })
    }

    // What changed, recorded before the change, so the history is auditable.
    const changes: Array<{ field: string; from: string | null; to: string | null }> = []
    if (odds !== undefined && odds !== row.odds) changes.push({ field: 'odds', from: String(row.odds), to: String(odds) })
    if (stake !== undefined && stake !== row.stake) changes.push({ field: 'stake', from: String(row.stake), to: String(stake) })
    if (note !== undefined && note !== (row.note ?? null)) changes.push({ field: 'note', from: row.note ?? null, to: note })
    const settling = status !== undefined && status !== row.status
    if (settling) changes.push({ field: 'status', from: row.status, to: status })
    const wasTags = (row.tags ?? []).join(', ')
    if (tags !== undefined && tags.join(', ') !== wasTags) {
      changes.push({ field: 'tags', from: wasTags || null, to: tags.join(', ') || null })
    }

    await db
      .update(userBet)
      .set({
        ...(odds === undefined ? {} : { odds }),
        ...(stake === undefined ? {} : { stake }),
        ...(note === undefined ? {} : { note }),
        ...(tags === undefined ? {} : { tags }),
        ...(settling
          ? {
              status,
              profit: Math.round(MANUAL_STATUS[status](odds ?? row.odds, stake ?? row.stake) * 100) / 100,
              settledAt: status === 'laukia' ? null : new Date(),
              // Where the result came from matters when it disagrees with ours.
              resultSource: status === 'laukia' ? null : 'member',
            }
          : {}),
      })
      .where(and(eq(userBet.id, id), eq(userBet.userId, user.id)))

    if (changes.length) {
      await db.insert(betEdit).values(
        changes.map((change) => ({
          id: `edit-${crypto.randomUUID()}`,
          betId: id,
          userId: user.id,
          field: change.field,
          fromValue: change.from,
          toValue: change.to,
        })),
      )
    }
    return NextResponse.json({ ok: true, changes: changes.length })
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
    // The bet is gone; the fact that it existed and was removed is not.
    await db.insert(betEdit).values({
      id: `edit-${crypto.randomUUID()}`,
      betId: id,
      userId: user.id,
      field: 'deleted',
      fromValue: `${row.stake} @ ${row.odds} ${row.bookmaker}`,
      toValue: null,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/bets DELETE]', error)
    return NextResponse.json({ error: 'Nepavyko ištrinti.' }, { status: 500 })
  }
}
