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

/** A message from the public contact page. */
export type ContactMessage = { email: string; message: string }

/** Messages without an account, all visitors together, per day: a flood stops here. */
export const DAILY_CONTACT_LIMIT = 100

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/

export function parseContact(input: unknown): { ok: true; value: ContactMessage } | { ok: false; error: string; spam?: true } {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Parašyk žinutę.' }
  const raw = input as Record<string, unknown>
  // A field people never see; bots fill every field they find.
  if (typeof raw.website === 'string' && raw.website.trim()) return { ok: false, error: 'spam', spam: true }
  const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : ''
  if (!EMAIL.test(email)) return { ok: false, error: 'Įrašyk el. paštą, kuriuo galėtume atsakyti.' }
  const message = typeof raw.message === 'string' ? raw.message.trim() : ''
  if (message.length < 5) return { ok: false, error: 'Parašyk bent kelis žodžius.' }
  if (message.length > 2000) return { ok: false, error: 'Žinutė per ilga: iki 2 000 ženklų.' }
  return { ok: true, value: { email, message } }
}

/** Saves a contact message, or returns false once today's shared limit is reached. */
export async function saveContact(contact: ContactMessage): Promise<boolean> {
  await ensureAppSchema()
  const { rowCount } = await pool.query(
    `INSERT INTO feedback (id, "userId", kind, message, page, "contactOk", "contactEmail")
     SELECT $1, NULL, 'other', $2, '/kontaktai', TRUE, $3
     WHERE (SELECT count(*) FROM feedback WHERE "userId" IS NULL AND "createdAt" > NOW() - INTERVAL '1 day') < $4`,
    [randomUUID(), contact.message, contact.email, DAILY_CONTACT_LIMIT],
  )
  return (rowCount ?? 0) > 0
}
