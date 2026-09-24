import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { SPORT_KEYS } from '@/lib/signal-taxonomy'

/**
 * Members asking for a bookmaker we do not cover yet. A request is a vote,
 * nothing more: it never turns on an integration or a signal. The owner sees
 * them counted by bookmaker name.
 */

export const REQUEST_COUNTRIES = ['LT', 'LV', 'EE', 'other'] as const
export type RequestCountry = (typeof REQUEST_COUNTRIES)[number]

export type BookRequest = {
  name: string
  country: RequestCountry
  sports: string[]
  comment: string | null
}

/** Requests one member may send per day; enough for honest use, useless for spam. */
export const DAILY_REQUEST_LIMIT = 5

export function parseBookRequest(input: unknown): { ok: true; value: BookRequest } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Užpildyk formą.' }
  const raw = input as Record<string, unknown>
  const name = typeof raw.name === 'string' ? raw.name.replace(/\s+/g, ' ').trim() : ''
  if (name.length < 2) return { ok: false, error: 'Įrašyk kontoros pavadinimą.' }
  if (name.length > 60) return { ok: false, error: 'Pavadinimas per ilgas.' }
  const country = REQUEST_COUNTRIES.includes(raw.country as RequestCountry) ? (raw.country as RequestCountry) : 'LT'
  const sports = Array.isArray(raw.sports) ? SPORT_KEYS.filter((key) => (raw.sports as unknown[]).includes(key)) : []
  const comment = typeof raw.comment === 'string' ? raw.comment.trim().slice(0, 500) : ''
  return { ok: true, value: { name, country, sports: [...sports], comment: comment || null } }
}

/** Saves a request, or returns false when the member hit today's limit. */
export async function saveBookRequest(userId: string, request: BookRequest): Promise<boolean> {
  await ensureAppSchema()
  const { rowCount } = await pool.query(
    `INSERT INTO book_request (id, "userId", name, country, sports, comment)
     SELECT $1, $2, $3, $4, $5, $6
     WHERE (SELECT count(*) FROM book_request WHERE "userId" = $2 AND "createdAt" > NOW() - INTERVAL '1 day') < $7`,
    [randomUUID(), userId, request.name, request.country, request.sports, request.comment, DAILY_REQUEST_LIMIT],
  )
  return (rowCount ?? 0) > 0
}

export type BookRequestTally = { name: string; members: number; requests: number; lastAt: string; sports: string[] }

/** Requests grouped by bookmaker name (case and spacing ignored), most wanted first. */
export async function bookRequestTally(): Promise<BookRequestTally[]> {
  await ensureAppSchema()
  const { rows } = await pool.query(
    `SELECT min(name) AS name, count(DISTINCT "userId")::int AS members, count(*)::int AS requests,
            max("createdAt") AS "lastAt",
            coalesce(array_agg(DISTINCT sport) FILTER (WHERE sport IS NOT NULL), '{}') AS sports
     FROM book_request LEFT JOIN LATERAL unnest(sports) AS sport ON TRUE
     GROUP BY lower(name)
     ORDER BY members DESC, "lastAt" DESC`,
  )
  return rows.map((row) => ({ ...row, lastAt: new Date(row.lastAt).toISOString() }))
}
