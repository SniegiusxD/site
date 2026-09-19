import { pool } from '@/lib/db'

let ensured = false

/** Idempotent DDL for user bets — safe to call on every API request. */
export async function ensureBetsSchema() {
  if (ensured) return
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      "userId" TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      "baseBankroll" DOUBLE PRECISION NOT NULL DEFAULT 500,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_bet (
      id TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      "signalId" TEXT,
      sport TEXT NOT NULL,
      match TEXT NOT NULL,
      "betDescription" TEXT NOT NULL,
      bookmaker TEXT NOT NULL,
      odds DOUBLE PRECISION NOT NULL,
      stake DOUBLE PRECISION NOT NULL,
      "marketType" TEXT NOT NULL DEFAULT 'moneyline',
      "pickName" TEXT,
      line DOUBLE PRECISION,
      "homeName" TEXT,
      "awayName" TEXT,
      "gameKey" TEXT,
      "startsAt" TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'laukia',
      profit DOUBLE PRECISION,
      "placedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "settledAt" TIMESTAMPTZ
    );

    -- 2026-09-14: value tracking. Entry fair probability from the signal, the
    -- match key for same-match warnings, and the closing price copied from
    -- live_signal once the VM captures it.
    ALTER TABLE user_bet
      ADD COLUMN IF NOT EXISTS "entryFairProb" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "eventKey" TEXT,
      ADD COLUMN IF NOT EXISTS "closingFairProb" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "closingCapturedAt" TIMESTAMPTZ;

    -- 2026-09-15: canonical outcomes from the aggregator's signal_result. The
    -- half outcomes cannot be recovered from status alone, so they are kept.
    ALTER TABLE user_bet
      ADD COLUMN IF NOT EXISTS "canonicalOutcome" TEXT,
      ADD COLUMN IF NOT EXISTS "resultSource" TEXT,
      ADD COLUMN IF NOT EXISTS "homeScore" INTEGER,
      ADD COLUMN IF NOT EXISTS "awayScore" INTEGER,
      -- Execution: the price we displayed, what the book actually gave, and how
      -- long the member took. Without these, CLV and ROI describe our screen
      -- rather than their account.
      ADD COLUMN IF NOT EXISTS "shownOdds" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "shownStake" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'accepted',
      ADD COLUMN IF NOT EXISTS "delaySeconds" INTEGER,
      -- A member's own note: why they took it, or what the book did.
      ADD COLUMN IF NOT EXISTS note TEXT;

    -- Every correction a member makes, so an edited history stays auditable.
    CREATE TABLE IF NOT EXISTS bet_edit (
      id TEXT PRIMARY KEY,
      "betId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      field TEXT NOT NULL,
      "fromValue" TEXT,
      "toValue" TEXT,
      "at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS bet_edit_bet_idx ON bet_edit ("betId", "at" DESC);

    CREATE INDEX IF NOT EXISTS user_bet_user_idx ON user_bet ("userId", "placedAt" DESC);
    CREATE INDEX IF NOT EXISTS user_bet_pending_idx ON user_bet ("userId", status) WHERE status = 'laukia';
    -- Settlement and the "starts soon" queries walk a member's open bets by kick-off.
    CREATE INDEX IF NOT EXISTS user_bet_status_start_idx ON user_bet ("userId", status, "startsAt");
    -- Fixture exposure and closing-price capture both look up by event.
    CREATE INDEX IF NOT EXISTS user_bet_event_idx ON user_bet ("eventKey") WHERE "eventKey" IS NOT NULL;
    -- One bet per member, signal and book: the route checked this in application
    -- code only, which two quick clicks can race past.
    CREATE UNIQUE INDEX IF NOT EXISTS user_bet_signal_book_key
      ON user_bet ("userId", "signalId", bookmaker) WHERE "signalId" IS NOT NULL;
  `)
  ensured = true
}
