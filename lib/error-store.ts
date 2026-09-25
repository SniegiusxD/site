import { createHash } from 'node:crypto'
import { pool } from '@/lib/db'
import { runLockedDdl } from '@/lib/db/locked-ddl'

/**
 * Errors kept in our own database. Vercel's Hobby plan keeps function logs for
 * one hour, so a `[client-error]` line was gone before anyone looked. Identical
 * errors are grouped (one row, a counter, first and last time), so a crash loop
 * adds to a count instead of filling the table. Rows unseen for 30 days go.
 */

export type ErrorEntry = {
  source: 'client' | 'server'
  kind: string
  message: string
  stack: string | null
  /** The page path (client) or route (server), never a query string. */
  where: string | null
  release: string
}

export type StoredError = ErrorEntry & { fingerprint: string; count: number; firstAt: string; lastAt: string }

/** Same error, same place: the first stack line is enough to tell two apart. */
export function errorFingerprint(entry: Pick<ErrorEntry, 'source' | 'message' | 'stack' | 'where'>): string {
  const top = entry.stack?.split('\n').find((line) => line.trim().startsWith('at ')) ?? ''
  // Numbers inside messages (ids, counts, sizes) would split one error into many.
  const message = entry.message.replace(/\d+/g, '#')
  return createHash('sha1').update(`${entry.source}|${message}|${top.trim()}|${entry.where ?? ''}`).digest('hex').slice(0, 20)
}

const KEEP_DAYS = 30

let tableReady: Promise<void> | null = null

function ensureTable(): Promise<void> {
  tableReady ??= runLockedDdl(
    `CREATE TABLE IF NOT EXISTS error_event (
       fingerprint TEXT PRIMARY KEY,
       source TEXT NOT NULL,
       kind TEXT NOT NULL,
       message TEXT NOT NULL,
       stack TEXT,
       "where" TEXT,
       release TEXT NOT NULL,
       count INTEGER NOT NULL DEFAULT 1,
       "firstAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       "lastAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
     );
     CREATE INDEX IF NOT EXISTS error_event_last_idx ON error_event ("lastAt" DESC);`,
  ).catch((error) => {
    tableReady = null
    throw error
  })
  return tableReady
}

/**
 * Stores one error. Never throws: a failure here is logged and dropped, since
 * error reporting must not become a second source of errors.
 */
export async function recordError(entry: ErrorEntry): Promise<void> {
  try {
    await ensureTable()
    await pool.query(
      `INSERT INTO error_event (fingerprint, source, kind, message, stack, "where", release)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (fingerprint) DO UPDATE
         SET count = error_event.count + 1, "lastAt" = NOW(), release = EXCLUDED.release`,
      [errorFingerprint(entry), entry.source, entry.kind, entry.message.slice(0, 500), entry.stack?.slice(0, 2000) ?? null, entry.where, entry.release],
    )
    // Cheap enough to do now and then rather than on a schedule.
    if (Math.random() < 0.02) {
      await pool.query(`DELETE FROM error_event WHERE "lastAt" < NOW() - make_interval(days => $1)`, [KEEP_DAYS])
    }
  } catch (error) {
    console.error('[error-store]', error instanceof Error ? error.message : error)
  }
}

/** The most recent distinct errors, for the owner page. Empty when the table does not exist yet. */
export async function recentErrors(limit = 20): Promise<StoredError[]> {
  try {
    const { rows } = await pool.query(
      `SELECT fingerprint, source, kind, message, stack, "where", release, count, "firstAt", "lastAt"
         FROM error_event ORDER BY "lastAt" DESC LIMIT $1`,
      [limit],
    )
    return rows.map((row) => ({
      fingerprint: row.fingerprint,
      source: row.source,
      kind: row.kind,
      message: row.message,
      stack: row.stack,
      where: row.where,
      release: row.release,
      count: Number(row.count),
      firstAt: new Date(row.firstAt).toISOString(),
      lastAt: new Date(row.lastAt).toISOString(),
    }))
  } catch (error) {
    if ((error as { code?: string }).code !== '42P01') console.error('[error-store] read', error)
    return []
  }
}

export const releaseTag = () => process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local'
