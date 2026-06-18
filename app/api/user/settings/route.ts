import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { userSettings } from '@/lib/db/schema'
import { ensureBetsSchema } from '@/lib/db/ensure-bets-schema'

export const dynamic = 'force-dynamic'

const DEFAULT_BANKROLL = 500

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

export async function GET() {
  const userId = await requireSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await ensureBetsSchema()
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
    const baseBankroll = rows[0]?.baseBankroll ?? null
    return NextResponse.json({ baseBankroll })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to load settings' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const userId = await requireSession()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await ensureBetsSchema()
    const body = await req.json()
    const value = Number(body.baseBankroll)
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: 'Invalid bankroll' }, { status: 400 })
    }
    // upsert on the userId primary key
    await db
      .insert(userSettings)
      .values({ userId, baseBankroll: value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { baseBankroll: value, updatedAt: new Date() },
      })
    return NextResponse.json({ baseBankroll: value })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save settings' },
      { status: 500 },
    )
  }
}
