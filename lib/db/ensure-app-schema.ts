import { pool } from '@/lib/db'
import { ensureBetsSchema } from '@/lib/db/ensure-bets-schema'

let ensured: Promise<void> | null = null

/**
 * Idempotent DDL for accounts: signal preferences, the 7-day trial and
 * subscription state, and the bankroll ledger. Additive only (ADD COLUMN IF
 * NOT EXISTS, CREATE TABLE IF NOT EXISTS), so it is safe against the live
 * database that June accounts already use.
 */
export function ensureAppSchema(): Promise<void> {
  ensured ??= (async () => {
    await ensureBetsSchema()
    await pool.query(`
      ALTER TABLE user_settings
        ADD COLUMN IF NOT EXISTS books TEXT[] NOT NULL DEFAULT ARRAY['7BET','TopSport','Betsson'],
        ADD COLUMN IF NOT EXISTS "minEdge" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
        ADD COLUMN IF NOT EXISTS "minOdds" DOUBLE PRECISION NOT NULL DEFAULT 1.3,
        ADD COLUMN IF NOT EXISTS "maxOdds" DOUBLE PRECISION NOT NULL DEFAULT 6,
        ADD COLUMN IF NOT EXISTS "maxHoursToStart" INTEGER NOT NULL DEFAULT 48,
        ADD COLUMN IF NOT EXISTS "kellyFraction" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
        ADD COLUMN IF NOT EXISTS "bookLimits" JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS subscription (
        "userId" TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'trialing'
          CHECK (status IN ('trialing', 'active', 'canceled', 'expired')),
        "trialEndsAt" TIMESTAMPTZ NOT NULL,
        "currentPeriodEnd" TIMESTAMPTZ,
        provider TEXT,
        "providerCustomerId" TEXT,
        "providerSubscriptionId" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bankroll_entry (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('start', 'deposit', 'withdrawal', 'adjustment')),
        amount DOUBLE PRECISION NOT NULL,
        note TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS bankroll_entry_user_idx
        ON bankroll_entry ("userId", "createdAt" DESC);
    `)
  })().catch((error) => {
    // Let the next request retry instead of caching a failed migration.
    ensured = null
    throw error
  })
  return ensured
}
