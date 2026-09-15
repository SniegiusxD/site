import type { Period } from '@/lib/bet-value'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { type TopBoard, type TopProfile, type TopRow, type TopSort, rankMembers, runningSeries } from '@/lib/top'
import { BOARD_SQL, SERIES_SQL } from '@/lib/top-sql'

const LEADERS_WITH_SERIES = 3

export async function loadTopBoard(viewerId: string, period: Period, month: string, sort: TopSort): Promise<TopBoard> {
  await ensureAppSchema()
  const monthArgs = period === 'month' ? [month] : []
  const { rows } = await pool.query<TopRow>(BOARD_SQL(period), [viewerId, ...monthArgs])
  const board = rankMembers(rows, viewerId, sort)

  const leaders = board.ranked.slice(0, LEADERS_WITH_SERIES)
  if (leaders.length) {
    const { rows: points } = await pool.query<{ userId: string; profit: number }>(SERIES_SQL(period), [
      leaders.map((leader) => leader.userId),
      ...monthArgs,
    ])
    for (const leader of leaders) {
      leader.series = runningSeries(points.filter((point) => point.userId === leader.userId).map((point) => point.profit))
    }
  }
  return board
}

export async function loadTopProfile(userId: string): Promise<TopProfile> {
  await ensureAppSchema()
  const { rows } = await pool.query<{ optIn: boolean; name: string | null }>(
    `SELECT "topOptIn" AS "optIn", "topName" AS name FROM user_settings WHERE "userId" = $1`,
    [userId],
  )
  const name = rows[0]?.name ?? null
  return { optIn: Boolean(rows[0]?.optIn && name), name }
}

export async function saveTopProfile(
  userId: string,
  profile: TopProfile,
): Promise<{ ok: true; profile: TopProfile } | { ok: false; error: string }> {
  await ensureAppSchema()
  try {
    await pool.query(
      `INSERT INTO user_settings ("userId", "topOptIn", "topName") VALUES ($1, $2, $3)
       ON CONFLICT ("userId") DO UPDATE SET
         "topOptIn" = EXCLUDED."topOptIn",
         "topName" = EXCLUDED."topName",
         "updatedAt" = NOW()`,
      [userId, profile.optIn, profile.name],
    )
    return { ok: true, profile }
  } catch (error) {
    // Nicknames are unique regardless of case (user_settings_top_name_idx).
    if ((error as { code?: string }).code === '23505') return { ok: false, error: 'Toks vardas jau užimtas. Pasirink kitą.' }
    throw error
  }
}
