import type { PoolClient } from 'pg'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'

/**
 * Everything the site stores about one member, for the two rights the privacy
 * policy promises: a copy of it (access and portability) and its deletion.
 *
 * The table list is written out rather than discovered, so a new table that
 * holds member data has to be added here on purpose. The test in
 * lib/__tests__/account-data.test.ts fails when one is missing.
 */

/** Tables keyed by "userId", exported as they are. */
export const MEMBER_TABLES = [
  'user_settings',
  'subscription',
  'bankroll_entry',
  'user_bet',
  'bet_edit',
  'book_limit_event',
  'telegram_account',
  'telegram_preset',
  'telegram_sent',
  'telegram_link_token',
  'billing_event',
] as const

/** Columns that are the site's own machinery, not the member's data. */
const LEFT_OUT: Record<string, string[]> = {
  // Session tokens and password hashes are secrets, not personal history; a copy
  // of them helps nobody and a leaked export would hand them over.
  session: ['token'],
  account: ['password', 'accessToken', 'refreshToken', 'idToken'],
  // A pending one-time link would let whoever holds the export connect a chat.
  telegram_link_token: ['token'],
}

type Queryable = Pick<PoolClient, 'query'>

async function rows(q: Queryable, table: string, userId: string): Promise<Record<string, unknown>[]> {
  const { rows } = await q.query(`SELECT * FROM "${table}" WHERE "userId" = $1`, [userId])
  const drop = LEFT_OUT[table] ?? []
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !drop.includes(key))))
}

export type AccountExport = {
  exportedAt: string
  note: string
  user: Record<string, unknown>
  signIns: Record<string, unknown>[]
  logins: Record<string, unknown>[]
  data: Record<(typeof MEMBER_TABLES)[number], Record<string, unknown>[]>
}

export async function exportAccount(userId: string): Promise<AccountExport> {
  await ensureAppSchema()
  const { rows: users } = await pool.query(
    `SELECT id, name, email, "emailVerified", "createdAt", "updatedAt" FROM "user" WHERE id = $1`,
    [userId],
  )
  const data = {} as AccountExport['data']
  for (const table of MEMBER_TABLES) data[table] = await rows(pool, table, userId)
  return {
    exportedAt: new Date().toISOString(),
    note:
      'Visi duomenys, kuriuos Statyk saugo apie tavo paskyrą. Slaptažodžio maiša ir sesijų raktai neįtraukti — tai saugumo priemonės, ne tavo duomenys. Mokėjimų kortelių duomenų Statyk nesaugo: juos tvarko Stripe.',
    user: users[0] ?? {},
    signIns: await rows(pool, 'session', userId),
    logins: await rows(pool, 'account', userId),
    data,
  }
}

/**
 * Deletes the member and everything under them, in one transaction. Most
 * tables cascade from "user"; bet_edit and billing_event carry the id without a
 * foreign key, so they are removed first, and verification rows are keyed by
 * email rather than id.
 */
export async function deleteAccount(userId: string, email: string): Promise<void> {
  await ensureAppSchema()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM bet_edit WHERE "userId" = $1`, [userId])
    await client.query(`DELETE FROM billing_event WHERE "userId" = $1`, [userId])
    for (const table of MEMBER_TABLES) {
      await client.query(`DELETE FROM "${table}" WHERE "userId" = $1`, [userId])
    }
    await client.query(`DELETE FROM session WHERE "userId" = $1`, [userId])
    await client.query(`DELETE FROM account WHERE "userId" = $1`, [userId])
    await client.query(`DELETE FROM verification WHERE identifier = $1`, [email])
    await client.query(`DELETE FROM "user" WHERE id = $1`, [userId])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
