import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { type BankrollKind, parseBankrollChange } from '@/lib/bankroll'
import { type BookLimits, type LimitEvent, limitChanges } from '@/lib/book-limits'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import type { BookName } from '@/lib/landing-signals'
import { DEFAULT_PREFERENCES, type Preferences, type Settings } from '@/lib/preferences'
import type { Access } from '@/lib/subscription'
import { getAccess } from '@/lib/subscription-store'

type Queryable = Pick<PoolClient, 'query'>

export type BankrollEntry = {
  id: string
  kind: BankrollKind
  amount: number
  note: string | null
  createdAt: string
}

export type Bankroll = {
  /** What stakes are sized from: deposits minus withdrawals plus settled profit. */
  current: number
  /** Net money put in: start, deposits, withdrawals, adjustments. */
  deposited: number
  settledProfit: number
}

export type Account = {
  onboarded: boolean
  preferences: Preferences
  bankroll: Bankroll
  access: Access
}

const round2 = (value: number) => Math.round(value * 100) / 100

type SettingsRow = {
  baseBankroll: number
  books: string[]
  minEdge: number
  minOdds: number
  maxOdds: number
  maxHoursToStart: number
  kellyFraction: number
  bookLimits: Partial<Record<BookName, number>> | null
  onboardedAt: Date | null
  dailyBets: number
  fixedStake: number | null
}

async function readSettings(q: Queryable, userId: string): Promise<SettingsRow | null> {
  const { rows } = await q.query<SettingsRow>(
    `SELECT "baseBankroll", books, "minEdge", "minOdds", "maxOdds", "maxHoursToStart",
            "kellyFraction", "bookLimits", "onboardedAt", "dailyBets", "fixedStake"
       FROM user_settings WHERE "userId" = $1`,
    [userId],
  )
  return rows[0] ?? null
}

type BankrollState = Bankroll & { entries: number; realisedProfit: number }

async function readBankroll(q: Queryable, userId: string, legacyBase: number | null): Promise<BankrollState> {
  const { rows } = await q.query<{ total: number | null; entries: string; profit: number | null }>(
    `SELECT (SELECT SUM(amount) FROM bankroll_entry WHERE "userId" = $1) AS total,
            (SELECT COUNT(*) FROM bankroll_entry WHERE "userId" = $1) AS entries,
            (SELECT SUM(profit) FROM user_bet WHERE "userId" = $1 AND profit IS NOT NULL) AS profit`,
    [userId],
  )
  const entries = Number(rows[0].entries)
  const realisedProfit = round2(Number(rows[0].profit ?? 0))
  if (entries === 0) {
    // June accounts kept one fixed bankroll and no ledger. Show it as is.
    const base = round2(legacyBase ?? DEFAULT_PREFERENCES.bankroll)
    return { current: base, deposited: base, settledProfit: 0, entries, realisedProfit }
  }
  const deposited = round2(Number(rows[0].total ?? 0))
  return {
    current: round2(deposited + realisedProfit),
    deposited,
    settledProfit: realisedProfit,
    entries,
    realisedProfit,
  }
}

async function withTransaction<T>(run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await run(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Creates the settings row if missing and locks it for the transaction. */
async function lockSettingsRow(client: PoolClient, userId: string) {
  await client.query(`INSERT INTO user_settings ("userId") VALUES ($1) ON CONFLICT ("userId") DO NOTHING`, [userId])
  await client.query(`SELECT 1 FROM user_settings WHERE "userId" = $1 FOR UPDATE`, [userId])
}

async function insertEntry(q: Queryable, userId: string, kind: BankrollKind, amount: number, note: string | null) {
  await q.query(
    `INSERT INTO bankroll_entry (id, "userId", kind, amount, note) VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), userId, kind, round2(amount), note],
  )
}

/** Starts a ledger for an account that has none, keeping its current bankroll. */
async function ensureLedger(client: PoolClient, userId: string, state: BankrollState) {
  if (state.entries > 0) return state
  await insertEntry(client, userId, 'start', state.current - state.realisedProfit, null)
  return readBankroll(client, userId, null)
}

/** Keeps the June column in step so older endpoints read the same number. */
async function syncLegacyBase(q: Queryable, userId: string, current: number) {
  await q.query(`UPDATE user_settings SET "baseBankroll" = $2, "updatedAt" = NOW() WHERE "userId" = $1`, [
    userId,
    current,
  ])
}

/** Writes one row per bookmaker limit the member actually changed. */
async function recordLimitChanges(q: Queryable, userId: string, before: BookLimits, after: BookLimits) {
  for (const change of limitChanges(before, after)) {
    await q.query(
      `INSERT INTO book_limit_event (id, "userId", bookmaker, "fromLimit", "toLimit") VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), userId, change.bookmaker, change.from, change.to],
    )
  }
}

/** The member's own record of how each bookmaker's ceiling moved. */
export async function listBookLimitEvents(userId: string, limit = 30): Promise<LimitEvent[]> {
  await ensureAppSchema()
  const { rows } = await pool.query<{
    id: string
    bookmaker: string
    fromLimit: number | null
    toLimit: number | null
    at: Date
  }>(
    `SELECT id, bookmaker, "fromLimit", "toLimit", "at" FROM book_limit_event
      WHERE "userId" = $1 ORDER BY "at" DESC LIMIT $2`,
    [userId, limit],
  )
  return rows.map((row) => ({
    id: row.id,
    bookmaker: row.bookmaker as LimitEvent['bookmaker'],
    from: row.fromLimit,
    to: row.toLimit,
    at: row.at.toISOString(),
  }))
}

async function upsertSettings(q: Queryable, userId: string, settings: Settings, markOnboarded: boolean) {
  await q.query(
    `INSERT INTO user_settings
       ("userId", books, "minEdge", "minOdds", "maxOdds", "maxHoursToStart", "kellyFraction",
        "bookLimits", "onboardedAt", "updatedAt", "dailyBets", "fixedStake")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, CASE WHEN $9::boolean THEN NOW() END, NOW(), $10, $11)
     ON CONFLICT ("userId") DO UPDATE SET
       "dailyBets" = EXCLUDED."dailyBets",
       "fixedStake" = EXCLUDED."fixedStake",
       books = EXCLUDED.books,
       "minEdge" = EXCLUDED."minEdge",
       "minOdds" = EXCLUDED."minOdds",
       "maxOdds" = EXCLUDED."maxOdds",
       "maxHoursToStart" = EXCLUDED."maxHoursToStart",
       "kellyFraction" = EXCLUDED."kellyFraction",
       "bookLimits" = EXCLUDED."bookLimits",
       "onboardedAt" = COALESCE(user_settings."onboardedAt", EXCLUDED."onboardedAt"),
       "updatedAt" = NOW()`,
    [
      userId,
      settings.books,
      settings.minEdge,
      settings.minOdds,
      settings.maxOdds,
      settings.maxHoursToStart,
      settings.kellyFraction,
      JSON.stringify(settings.bookLimits),
      markOnboarded,
      settings.dailyBets,
      settings.fixedStake,
    ],
  )
}

export async function loadAccount(userId: string): Promise<Account> {
  await ensureAppSchema()
  const settings = await readSettings(pool, userId)
  const state = await readBankroll(pool, userId, settings?.baseBankroll ?? null)
  const access = await getAccess(userId)
  const bankroll: Bankroll = {
    current: state.current,
    deposited: state.deposited,
    settledProfit: state.settledProfit,
  }
  const preferences: Preferences = settings
    ? {
        bankroll: state.current,
        books: settings.books.filter((book): book is BookName =>
          DEFAULT_PREFERENCES.books.includes(book as BookName),
        ),
        minEdge: settings.minEdge,
        minOdds: settings.minOdds,
        maxOdds: settings.maxOdds,
        maxHoursToStart: settings.maxHoursToStart,
        kellyFraction: settings.kellyFraction,
        bookLimits: settings.bookLimits ?? {},
        dailyBets: settings.dailyBets ?? DEFAULT_PREFERENCES.dailyBets,
        fixedStake: settings.fixedStake ?? null,
      }
    : { ...DEFAULT_PREFERENCES, bankroll: state.current }
  return { onboarded: Boolean(settings?.onboardedAt), preferences, bankroll, access }
}

export async function completeOnboarding(userId: string, preferences: Preferences): Promise<void> {
  await ensureAppSchema()
  await withTransaction(async (client) => {
    await lockSettingsRow(client, userId)
    const { bankroll, ...settings } = preferences
    const before = await readSettings(client, userId)
    await recordLimitChanges(client, userId, before?.bookLimits ?? {}, settings.bookLimits)
    await upsertSettings(client, userId, settings, true)
    const state = await readBankroll(client, userId, null)
    if (state.entries === 0) {
      await insertEntry(client, userId, 'start', bankroll - state.realisedProfit, null)
    } else if (Math.abs(bankroll - state.current) >= 0.01) {
      await insertEntry(client, userId, 'adjustment', bankroll - state.current, 'Pakeista pradžios nustatymuose')
    }
    await syncLegacyBase(client, userId, bankroll)
  })
}

export async function saveSettings(userId: string, settings: Settings): Promise<void> {
  await ensureAppSchema()
  await withTransaction(async (client) => {
    await lockSettingsRow(client, userId)
    const before = await readSettings(client, userId)
    await recordLimitChanges(client, userId, before?.bookLimits ?? {}, settings.bookLimits)
    await upsertSettings(client, userId, settings, false)
  })
}

export async function listBankrollEntries(userId: string, limit = 50): Promise<BankrollEntry[]> {
  await ensureAppSchema()
  const { rows } = await pool.query<{
    id: string
    kind: BankrollKind
    amount: number
    note: string | null
    createdAt: Date
  }>(
    `SELECT id, kind, amount, note, "createdAt" FROM bankroll_entry
      WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
    [userId, limit],
  )
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))
}

export async function recordBankrollChange(
  userId: string,
  input: unknown,
): Promise<{ ok: true; bankroll: Bankroll } | { ok: false; error: string }> {
  await ensureAppSchema()
  return withTransaction(async (client) => {
    await lockSettingsRow(client, userId)
    const settings = await readSettings(client, userId)
    const state = await ensureLedger(client, userId, await readBankroll(client, userId, settings?.baseBankroll ?? null))
    const change = parseBankrollChange(input, state.current)
    if (!change.ok) return change
    await insertEntry(client, userId, change.value.kind, change.signedAmount, change.value.note)
    const next = await readBankroll(client, userId, null)
    await syncLegacyBase(client, userId, next.current)
    return { ok: true, bankroll: { current: next.current, deposited: next.deposited, settledProfit: next.settledProfit } }
  })
}
