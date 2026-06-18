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

    CREATE INDEX IF NOT EXISTS user_bet_user_idx ON user_bet ("userId", "placedAt" DESC);
    CREATE INDEX IF NOT EXISTS user_bet_pending_idx ON user_bet ("userId", status) WHERE status = 'laukia';
  `)
  ensured = true
}
