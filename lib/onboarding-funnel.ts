import { pool } from '@/lib/db'
import { runLockedDdl } from '@/lib/db/locked-ddl'
import { FINISHED_STEP, FUNNEL_STEPS } from '@/lib/funnel-client'

/**
 * Where new members stop in the 7-step start. Each browser gets a random id
 * (never the account id), and each step it reaches is one row, so a reload does
 * not count twice. Nothing goes to third parties; rows go after 90 days.
 */

const KEEP_DAYS = 90
const VISITOR = /^[a-z0-9]{16,40}$/

export type FunnelStep = { step: number; name: string; reached: number }

export function parseFunnelEvent(input: unknown): { visitor: string; step: number } | null {
  if (!input || typeof input !== 'object') return null
  const { visitor, step } = input as Record<string, unknown>
  if (typeof visitor !== 'string' || !VISITOR.test(visitor)) return null
  if (!Number.isInteger(step) || (step as number) < 0 || (step as number) > FINISHED_STEP) return null
  return { visitor, step: step as number }
}

let ensured: Promise<void> | null = null
function ensureFunnelSchema(): Promise<void> {
  ensured ??= runLockedDdl(`
    CREATE TABLE IF NOT EXISTS onboarding_step (
      visitor TEXT NOT NULL,
      step SMALLINT NOT NULL,
      "at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (visitor, step)
    );
    CREATE INDEX IF NOT EXISTS onboarding_step_at_idx ON onboarding_step ("at");
  `).catch((error) => {
    ensured = null
    throw error
  })
  return ensured
}

export async function recordFunnelStep(visitor: string, step: number): Promise<void> {
  await ensureFunnelSchema()
  await pool.query(
    `INSERT INTO onboarding_step (visitor, step) VALUES ($1, $2) ON CONFLICT (visitor, step) DO NOTHING`,
    [visitor, step],
  )
  // The table stays tiny; trimming on write keeps it that way without a cron.
  await pool.query(`DELETE FROM onboarding_step WHERE "at" < NOW() - make_interval(days => $1)`, [KEEP_DAYS])
}

/** How many browsers reached each step in the last `days` days. */
export async function loadFunnel(days: number): Promise<FunnelStep[]> {
  await ensureFunnelSchema()
  const { rows } = await pool.query<{ step: number; reached: string }>(
    `SELECT step, COUNT(*)::text AS reached FROM onboarding_step
      WHERE "at" > NOW() - make_interval(days => $1) GROUP BY step`,
    [days],
  )
  const byStep = new Map(rows.map((row) => [Number(row.step), Number(row.reached)]))
  return FUNNEL_STEPS.map((name, step) => ({ step, name, reached: byStep.get(step) ?? 0 }))
}
