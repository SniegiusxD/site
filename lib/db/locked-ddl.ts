import { pool } from '@/lib/db'

/**
 * Runs schema DDL one caller at a time. `CREATE TABLE IF NOT EXISTS` is not
 * safe under concurrency: two first requests (or the build's parallel
 * prerender workers on a fresh database) can both pass the check and one dies
 * on `pg_type_typname_nsp_index` — seen in CI on 2026-09-25. A transaction-level
 * advisory lock makes the second wait and then find everything in place.
 */
export async function runLockedDdl(sql: string): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SELECT pg_advisory_xact_lock(hashtext('statyk-schema'))`)
    await client.query(sql)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}
