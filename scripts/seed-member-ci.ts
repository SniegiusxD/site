/** Minimal, deterministic schema and one live signal for logged-in browser CI. */
import { Pool } from 'pg'

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  await pool.query(`
  CREATE TABLE "user" (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE, image TEXT,
    username TEXT UNIQUE, "displayUsername" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE session (
    id TEXT PRIMARY KEY, "expiresAt" TIMESTAMPTZ NOT NULL,
    token TEXT NOT NULL UNIQUE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(), "ipAddress" TEXT,
    "userAgent" TEXT, "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
  );
  CREATE TABLE account (
    id TEXT PRIMARY KEY, "accountId" TEXT NOT NULL, "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken" TEXT, "refreshToken" TEXT, "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ, "refreshTokenExpiresAt" TIMESTAMPTZ,
    scope TEXT, password TEXT, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE verification (
    id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL, "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE live_signal (
    id TEXT PRIMARY KEY, sport TEXT NOT NULL, starts_at TIMESTAMPTZ NOT NULL,
    market TEXT NOT NULL, direction TEXT, line DOUBLE PRECISION,
    fair_prob DOUBLE PRECISION NOT NULL, pinnacle_odds DOUBLE PRECISION,
    home TEXT, away TEXT, best_book TEXT NOT NULL, best_odds DOUBLE PRECISION NOT NULL,
    best_edge DOUBLE PRECISION NOT NULL, status TEXT NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL, last_seen_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ, event_key TEXT, closing_fair_prob DOUBLE PRECISION
  );
  CREATE TABLE live_signal_price (
    signal_id TEXT NOT NULL REFERENCES live_signal(id) ON DELETE CASCADE,
    book TEXT NOT NULL, odds DOUBLE PRECISION NOT NULL, edge DOUBLE PRECISION NOT NULL,
    published BOOLEAN NOT NULL, event_name TEXT, selection_label TEXT,
    captured_at TIMESTAMPTZ NOT NULL, soft_event_id TEXT, event_url TEXT,
    fair_price_interpolated BOOLEAN,
    fair_price_nearest_line_distance DOUBLE PRECISION,
    PRIMARY KEY (signal_id, book)
  );
  CREATE TABLE runner_status (
    id INTEGER PRIMARY KEY, cycle_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL, sharp_available BOOLEAN NOT NULL,
    published_count INTEGER NOT NULL, pinnacle_events INTEGER,
    sevenbet_events INTEGER, topsport_events INTEGER, betsson_events INTEGER
  );

  INSERT INTO live_signal VALUES (
    'ci-signal-1', 'basketball', NOW() + INTERVAL '1 day', 'spread', 'home', -2.5,
    0.55, 1.84, 'Vilniaus Testas', 'Kauno Testas', 'TopSport', 1.98, 0.089,
    'open', NOW() - INTERVAL '5 minutes', NOW(), NULL, 'ci-fixture-1', NULL
  );
  INSERT INTO live_signal_price VALUES (
    'ci-signal-1', 'TopSport', 1.98, 0.089, TRUE,
    'Vilniaus Testas – Kauno Testas', 'Vilniaus Testas -2.5', NOW(),
    'ci-soft-event-1', 'https://example.invalid/event/ci-soft-event-1', FALSE, 0
  );
  INSERT INTO runner_status VALUES (
    1, NOW() - INTERVAL '2 minutes', NOW(), TRUE, 1, 20, 10, 10, 5
  );

  -- A finished, graded signal for /rezultatai: it exercises the archive into
  -- signal_record and the joins to the VM's result and closing-price tables.
  -- Closed two days ago, so neither the board nor the 24-hour counts see it.
  CREATE TABLE signal_result (
    signal_id TEXT PRIMARY KEY, identity_version SMALLINT NOT NULL, canonical_market TEXT NOT NULL,
    market_period TEXT, overtime_rule TEXT, outcome TEXT NOT NULL, home_score INTEGER,
    away_score INTEGER, result_source TEXT NOT NULL, result_event_id TEXT,
    settlement_contract_version TEXT NOT NULL, graded_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE signal_closing_price (
    signal_id TEXT PRIMARY KEY, closing_fair_prob DOUBLE PRECISION NOT NULL,
    closing_captured_at TIMESTAMPTZ NOT NULL, minutes_before_start DOUBLE PRECISION,
    source TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  INSERT INTO live_signal VALUES (
    'ci-signal-past', 'basketball', NOW() - INTERVAL '2 days', 'total', 'over', 160.5,
    0.5, 1.95, 'Klaipėdos Testas', 'Šiaulių Testas', '7BET', 2.1, 0.05,
    'closed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'ci-fixture-past', NULL
  );
  INSERT INTO signal_closing_price VALUES (
    'ci-signal-past', 0.52, NOW() - INTERVAL '2 days', 5, 'pinnacle', NOW()
  );
  INSERT INTO signal_result VALUES (
    'ci-signal-past', 2, 'total', NULL, NULL, 'won', 85, 80, 'ci', NULL, 'v1', NOW() - INTERVAL '1 day', NOW()
  );
  `)

  await pool.end()
  console.log('seeded isolated member browser database')
}

void main()
