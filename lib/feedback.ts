import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import { FEEDBACK_KINDS, type FeedbackKind } from '@/lib/feedback-kinds'

/** A member's note from the help page. The owner reads them; nothing acts on them automatically. */

export type Feedback = { kind: FeedbackKind; message: string; page: string | null; contactOk: boolean }

export const DAILY_FEEDBACK_LIMIT = 10

export function parseFeedback(input: unknown): { ok: true; value: Feedback } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Parašyk žinutę.' }
  const raw = input as Record<string, unknown>
  const kind = FEEDBACK_KINDS.find((entry) => entry.key === raw.kind)?.key
  if (!kind) return { ok: false, error: 'Pasirink, apie ką rašai.' }
  const message = typeof raw.message === 'string' ? raw.message.trim() : ''
  if (message.length < 5) return { ok: false, error: 'Parašyk bent kelis žodžius.' }
  if (message.length > 2000) return { ok: false, error: 'Žinutė per ilga: iki 2 000 ženklų.' }
  // Only our own paths: a page the member came from, never an outside URL.
  const page = typeof raw.page === 'string' && /^\/[\w\-/]{0,80}$/.test(raw.page) ? raw.page : null
  return { ok: true, value: { kind, message, page, contactOk: raw.contactOk === true } }
}

/** Saves the note, or returns false once the member has sent today's limit. */
export async function saveFeedback(userId: string, feedback: Feedback): Promise<boolean> {
  await ensureAppSchema()
  const { rowCount } = await pool.query(
    `INSERT INTO feedback (id, "userId", kind, message, page, "contactOk")
     SELECT $1, $2, $3, $4, $5, $6
     WHERE (SELECT count(*) FROM feedback WHERE "userId" = $2 AND "createdAt" > NOW() - INTERVAL '1 day') < $7`,
    [randomUUID(), userId, feedback.kind, feedback.message, feedback.page, feedback.contactOk, DAILY_FEEDBACK_LIMIT],
  )
  return (rowCount ?? 0) > 0
}
