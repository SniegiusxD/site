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

      -- Every change a member makes to a bookmaker's stake limit. Lithuanian
      -- books cut winning accounts down over time, and that history is the
      -- member's own evidence of it; nothing else in the product keeps it.
      CREATE TABLE IF NOT EXISTS book_limit_event (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        bookmaker TEXT NOT NULL,
        "fromLimit" INTEGER,
        "toLimit" INTEGER,
        "at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS book_limit_event_user_idx
        ON book_limit_event ("userId", "at" DESC);

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

      -- Stripe billing. The period end already lives in "currentPeriodEnd";
      -- these say whether it is ending by the member's choice and whether a
      -- renewal is currently failing, which the profile has to show.
      ALTER TABLE subscription
        ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS "paymentFailedAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "priceId" TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS subscription_provider_customer_idx
        ON subscription ("providerCustomerId") WHERE "providerCustomerId" IS NOT NULL;

      -- Every Stripe event handled, by its id. Stripe delivers at least once, so
      -- a retried event must find itself here and do nothing the second time.
      CREATE TABLE IF NOT EXISTS billing_event (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        "userId" TEXT,
        "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
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
        ADD COLUMN IF NOT EXISTS "maxOdds" DOUBLE PRECISION NOT NULL DEFAULT 100,
        -- A pause with an end: alerts come back on their own, so nobody has to
        -- remember that they switched them off during a match.
        ADD COLUMN IF NOT EXISTS "pausedUntil" TIMESTAMPTZ;

      -- Saved alert rules a member can switch between ("Krepšinis 4 %+",
      -- "Tik TopSport"). Applying one writes into the same columns the bot
      -- already reads, so the preset is a site-side idea only.
      CREATE TABLE IF NOT EXISTS telegram_preset (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        settings JSONB NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS telegram_preset_name_idx
        ON telegram_preset ("userId", lower(name));

      CREATE TABLE IF NOT EXISTS telegram_link_token (
        token TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "expiresAt" TIMESTAMPTZ NOT NULL
      );

      -- Our own price history. The VM overwrites live_signal_price every cycle,
      -- so movement can only be known if we keep the captures ourselves.
      CREATE TABLE IF NOT EXISTS price_observation (
        "signalId" TEXT NOT NULL,
        book TEXT NOT NULL,
        odds DOUBLE PRECISION NOT NULL,
        edge DOUBLE PRECISION NOT NULL,
        "capturedAt" TIMESTAMPTZ NOT NULL,
        PRIMARY KEY ("signalId", book, "capturedAt")
      );
      CREATE INDEX IF NOT EXISTS price_observation_captured_idx
        ON price_observation ("capturedAt" DESC);

      CREATE TABLE IF NOT EXISTS telegram_sent (
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "signalId" TEXT NOT NULL,
        "sentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY ("userId", "signalId")
      );

      -- What a member did with a signal before betting: opened the bookmaker's
      -- event page or copied the event name to search for it. With user_bet
      -- (which keeps signalId and createdAt) this measures how long it takes
      -- from our first sight of a price to a placed bet, and at what price.
      CREATE TABLE IF NOT EXISTS execution_event (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "signalId" TEXT NOT NULL,
        book TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('open_book', 'copy_event')),
        "shownOdds" DOUBLE PRECISION,
        "shownEdge" DOUBLE PRECISION,
        "firstSeenAt" TIMESTAMPTZ,
        "at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS execution_event_signal_idx
        ON execution_event ("signalId", "at");
      CREATE INDEX IF NOT EXISTS execution_event_user_idx
        ON execution_event ("userId", "at" DESC);

      -- A member asking for a bookmaker we do not cover yet. A vote only.
      CREATE TABLE IF NOT EXISTS book_request (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        country TEXT NOT NULL DEFAULT 'LT',
        sports TEXT[] NOT NULL DEFAULT '{}',
        comment TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS book_request_user_idx
        ON book_request ("userId", "createdAt" DESC);

      -- What members tell us from the help page: a bug, an idea, a sport or
      -- market they want. contactOk says whether we may answer by email.
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('bug', 'idea', 'market', 'other')),
        message TEXT NOT NULL,
        page TEXT,
        "contactOk" BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'new',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS feedback_created_idx ON feedback ("createdAt" DESC);
      CREATE INDEX IF NOT EXISTS feedback_user_idx ON feedback ("userId", "createdAt" DESC);
    `)
  })().catch((error) => {
    // Let the next request retry instead of caching a failed migration.
    ensured = null
    throw error
  })
  return ensured
}
