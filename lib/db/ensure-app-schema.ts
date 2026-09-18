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
        ADD COLUMN IF NOT EXISTS "onboardedAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "dailyBets" INTEGER NOT NULL DEFAULT 10,
        ADD COLUMN IF NOT EXISTS "topOptIn" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "topName" TEXT;

      -- Topas: members shown by nickname only after they switch it on.
      -- Nicknames are unique regardless of case.
      CREATE UNIQUE INDEX IF NOT EXISTS user_settings_top_name_idx
        ON user_settings (lower("topName")) WHERE "topName" IS NOT NULL;

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

      -- Free accounts: signing up takes no trial, so the trial dates start
      -- empty and "trialStartedAt" records the one time they are used.
      ALTER TABLE subscription
        ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMPTZ;
      ALTER TABLE subscription
        ALTER COLUMN "trialEndsAt" DROP NOT NULL,
        ALTER COLUMN status SET DEFAULT 'free';
      ALTER TABLE subscription DROP CONSTRAINT IF EXISTS subscription_status_check;
      ALTER TABLE subscription ADD CONSTRAINT subscription_status_check
        CHECK (status IN ('free', 'trialing', 'active', 'canceled', 'expired'));
      -- Accounts from before the free tier all took a trial on sign-up.
      UPDATE subscription SET "trialStartedAt" = "createdAt"
        WHERE "trialStartedAt" IS NULL AND status <> 'free';

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

      -- Telegram alerts. Mirrored by aggregator scripts/setup_telegram_bot_db.py,
      -- which grants the VM bot service access; keep the two in step.
      CREATE TABLE IF NOT EXISTS telegram_account (
        "userId" TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
        "chatId" BIGINT UNIQUE,
        username TEXT,
        "linkedAt" TIMESTAMPTZ,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        "minEdge" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
        "maxHoursToStart" INTEGER NOT NULL DEFAULT 24,
        books TEXT[] NOT NULL DEFAULT ARRAY['7BET','TopSport','Betsson'],
        "quietStart" SMALLINT CHECK ("quietStart" BETWEEN 0 AND 23),
        "quietEnd" SMALLINT CHECK ("quietEnd" BETWEEN 0 AND 23),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Alert filters added 2026-09-18. An empty array means no restriction.
      ALTER TABLE telegram_account
        ADD COLUMN IF NOT EXISTS sports TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS markets TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS periods TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "minOdds" DOUBLE PRECISION NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS "maxOdds" DOUBLE PRECISION NOT NULL DEFAULT 100;

      CREATE TABLE IF NOT EXISTS telegram_link_token (
        token TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "expiresAt" TIMESTAMPTZ NOT NULL
      );

      CREATE TABLE IF NOT EXISTS telegram_sent (
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "signalId" TEXT NOT NULL,
        "sentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("userId", "signalId")
      );
    `)
  })().catch((error) => {
    // Let the next request retry instead of caching a failed migration.
    ensured = null
    throw error
  })
  return ensured
}
