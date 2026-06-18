import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { ensureBetsSchema } from '@/lib/db/ensure-bets-schema'
import { settlePendingBets } from '@/lib/settle-bets'

export const dynamic = 'force-dynamic'

/**
 * #40 backend settlement endpoint. A VPS cron calls this every 10–15 min with
 * the shared secret; it grades ALL users' pending bets without anyone opening
 * the app. Returns a summary (logged on the VPS side).
 *
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" \
 *     https://<site>/api/cron/settle
 */
export async function GET() {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authz = (await headers()).get('authorization') ?? ''
  if (authz !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureBetsSchema()
    const summary = await settlePendingBets()
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'settle failed' },
      { status: 500 },
    )
  }
}
