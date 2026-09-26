import { randomBytes } from 'node:crypto'
import { pool } from '@/lib/db'
import { ensureAppSchema } from '@/lib/db/ensure-app-schema'
import type { BookName } from '@/lib/landing-signals'
import { DEFAULT_TELEGRAM_SETTINGS, type TelegramSettings } from '@/lib/telegram-settings'

/**
 * Telegram alerts, site side: linking a member's chat, their alert settings
 * and a test message. Alerts themselves are sent by the aggregator VM service
 * (scripts/telegram_bot_service.py), which also answers the bot's commands.
 */

const API = 'https://api.telegram.org'
const LINK_TTL_MINUTES = 30

export type TelegramState = {
  configured: boolean
  connected: boolean
  username: string | null
  linkedAt: string | null
  botUsername: string | null
  settings: TelegramSettings
  /** When a timed pause ends, while one is running. */
  pausedUntil: string | null
  presets: TelegramPreset[]
  /** A message when a tracked bet settles, and a Monday summary (user_settings). */
  notifySettled: boolean
}

export type TelegramPreset = { id: string; name: string; settings: TelegramSettings }

function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null
}

let botUsernameCache: string | null = null

export async function getBotUsername(): Promise<string | null> {
  if (botUsernameCache) return botUsernameCache
  const token = botToken()
  if (!token) return null
  try {
    const response = await fetch(`${API}/bot${token}/getMe`, { cache: 'no-store' })
    const body = await response.json()
    botUsernameCache = body?.ok ? (body.result?.username ?? null) : null
  } catch {
    botUsernameCache = null
  }
  return botUsernameCache
}

export async function sendTelegramMessage(chatId: string, html: string): Promise<boolean> {
  const token = botToken()
  if (!token) return false
  try {
    const response = await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
      cache: 'no-store',
    })
    const body = await response.json().catch(() => null)
    return Boolean(body?.ok)
  } catch {
    return false
  }
}

type AccountRow = {
  chatId: string | null
  username: string | null
  linkedAt: Date | null
  enabled: boolean
  minEdge: number
  maxHoursToStart: number
  books: string[]
  sports: string[]
  markets: string[]
  periods: string[]
  minOdds: number
  maxOdds: number
  quietStart: number | null
  quietEnd: number | null
  pausedUntil: Date | null
}

/**
 * Ends the pauses whose time is up. A member who paused alerts for an hour
 * should not have to come back and switch them on, and the bot only reads
 * `enabled`, so the flag has to be put back here.
 */
export async function resumeExpiredPauses(userId?: string): Promise<number> {
  await ensureAppSchema()
  const { rowCount } = await pool.query(
    `UPDATE telegram_account SET enabled = TRUE, "pausedUntil" = NULL, "updatedAt" = NOW()
      WHERE "pausedUntil" IS NOT NULL AND "pausedUntil" <= NOW()${userId ? ' AND "userId" = $1' : ''}`,
    userId ? [userId] : [],
  )
  return rowCount ?? 0
}

/** Stop alerts until a moment, or until the member turns them back on. */
export async function pauseTelegram(userId: string, until: Date | null): Promise<void> {
  await ensureAppSchema()
  await pool.query(
    `INSERT INTO telegram_account ("userId", enabled, "pausedUntil", "updatedAt") VALUES ($1, FALSE, $2, NOW())
     ON CONFLICT ("userId") DO UPDATE SET enabled = FALSE, "pausedUntil" = EXCLUDED."pausedUntil", "updatedAt" = NOW()`,
    [userId, until],
  )
}

/** Start them again now, whatever the pause said. */
export async function resumeTelegram(userId: string): Promise<void> {
  await ensureAppSchema()
  await pool.query(
    `UPDATE telegram_account SET enabled = TRUE, "pausedUntil" = NULL, "updatedAt" = NOW() WHERE "userId" = $1`,
    [userId],
  )
}

export async function loadTelegramState(userId: string): Promise<TelegramState> {
  await ensureAppSchema()
  await resumeExpiredPauses(userId)
  const { rows } = await pool.query<AccountRow>(
    `SELECT "chatId"::text AS "chatId", username, "linkedAt", enabled, "minEdge", "maxHoursToStart",
            books, sports, markets, periods, "minOdds", "maxOdds", "quietStart", "quietEnd", "pausedUntil"
       FROM telegram_account WHERE "userId" = $1`,
    [userId],
  )
  const row = rows[0]
  const [botUsername, presets, notifySettled] = await Promise.all([
    getBotUsername(),
    listTelegramPresets(userId),
    loadNotifySettled(userId),
  ])
  return {
    configured: Boolean(botToken()),
    connected: Boolean(row?.chatId),
    username: row?.username ?? null,
    linkedAt: row?.linkedAt ? row.linkedAt.toISOString() : null,
    botUsername,
    settings: row
      ? {
          enabled: row.enabled,
          minEdge: row.minEdge,
          maxHoursToStart: row.maxHoursToStart,
          books: row.books as BookName[],
          sports: row.sports ?? [],
          markets: row.markets ?? [],
          periods: row.periods ?? [],
          minOdds: row.minOdds ?? 1,
          maxOdds: row.maxOdds ?? 100,
          quietStart: row.quietStart,
          quietEnd: row.quietEnd,
        }
      : DEFAULT_TELEGRAM_SETTINGS,
    pausedUntil: row?.pausedUntil ? row.pausedUntil.toISOString() : null,
    presets,
    notifySettled,
  }
}

async function loadNotifySettled(userId: string): Promise<boolean> {
  const { rows } = await pool.query<{ notifySettled: boolean | null }>(
    `SELECT "notifySettled" FROM user_settings WHERE "userId" = $1`,
    [userId],
  )
  return rows[0]?.notifySettled ?? true
}

/** Settlement messages on or off. Stored on user_settings, where the bot reads it. */
export async function saveNotifySettled(userId: string, on: boolean): Promise<void> {
  await ensureAppSchema()
  await pool.query(
    `INSERT INTO user_settings ("userId", "notifySettled", "updatedAt") VALUES ($1, $2, NOW())
     ON CONFLICT ("userId") DO UPDATE SET "notifySettled" = EXCLUDED."notifySettled", "updatedAt" = NOW()`,
    [userId, on],
  )
}

/** The member's saved alert rules, oldest first so the list does not reshuffle. */
export async function listTelegramPresets(userId: string): Promise<TelegramPreset[]> {
  const { rows } = await pool.query<{ id: string; name: string; settings: TelegramSettings }>(
    `SELECT id, name, settings FROM telegram_preset WHERE "userId" = $1 ORDER BY "createdAt"`,
    [userId],
  )
  return rows
}

/** Saves the current rules under a name, replacing a preset of the same name. */
export async function saveTelegramPreset(userId: string, name: string, settings: TelegramSettings): Promise<void> {
  await ensureAppSchema()
  await pool.query(
    `INSERT INTO telegram_preset (id, "userId", name, settings) VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT ("userId", lower(name)) DO UPDATE SET settings = EXCLUDED.settings, name = EXCLUDED.name`,
    [`tp-${randomBytes(12).toString('hex')}`, userId, name, JSON.stringify(settings)],
  )
}

export async function deleteTelegramPreset(userId: string, id: string): Promise<void> {
  await ensureAppSchema()
  await pool.query(`DELETE FROM telegram_preset WHERE id = $1 AND "userId" = $2`, [id, userId])
}

/** A one-time deep link. Opening it and pressing Start links the chat to this account. */
export async function createLinkUrl(userId: string): Promise<string | null> {
  const username = await getBotUsername()
  if (!username) return null
  await ensureAppSchema()
  // Telegram start parameters allow [A-Za-z0-9_-], up to 64 characters.
  const token = randomBytes(24).toString('base64url')
  await pool.query(`DELETE FROM telegram_link_token WHERE "userId" = $1 OR "expiresAt" < NOW()`, [userId])
  await pool.query(
    `INSERT INTO telegram_link_token (token, "userId", "expiresAt")
     VALUES ($1, $2, NOW() + make_interval(mins => $3))`,
    [token, userId, LINK_TTL_MINUTES],
  )
  return `https://t.me/${username}?start=${token}`
}

export async function saveTelegramSettings(userId: string, settings: TelegramSettings): Promise<void> {
  await ensureAppSchema()
  await pool.query(
    `INSERT INTO telegram_account ("userId", enabled, "minEdge", "maxHoursToStart", books, sports, markets,
                                   periods, "minOdds", "maxOdds", "quietStart", "quietEnd", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
     ON CONFLICT ("userId") DO UPDATE SET
       enabled = EXCLUDED.enabled, "minEdge" = EXCLUDED."minEdge",
       "maxHoursToStart" = EXCLUDED."maxHoursToStart", books = EXCLUDED.books,
       sports = EXCLUDED.sports, markets = EXCLUDED.markets, periods = EXCLUDED.periods,
       "minOdds" = EXCLUDED."minOdds", "maxOdds" = EXCLUDED."maxOdds",
       "quietStart" = EXCLUDED."quietStart", "quietEnd" = EXCLUDED."quietEnd", "updatedAt" = NOW()`,
    [
      userId,
      settings.enabled,
      settings.minEdge,
      settings.maxHoursToStart,
      settings.books,
      settings.sports,
      settings.markets,
      settings.periods,
      settings.minOdds,
      settings.maxOdds,
      settings.quietStart,
      settings.quietEnd,
    ],
  )
}

export async function disconnectTelegram(userId: string): Promise<void> {
  await ensureAppSchema()
  await pool.query(
    `UPDATE telegram_account SET "chatId" = NULL, username = NULL, "linkedAt" = NULL, "updatedAt" = NOW()
      WHERE "userId" = $1`,
    [userId],
  )
  await pool.query(`DELETE FROM telegram_link_token WHERE "userId" = $1`, [userId])
}

export async function sendTestMessage(userId: string): Promise<'sent' | 'not-connected' | 'failed'> {
  await ensureAppSchema()
  const { rows } = await pool.query<{ chatId: string | null }>(
    `SELECT "chatId"::text AS "chatId" FROM telegram_account WHERE "userId" = $1`,
    [userId],
  )
  const chatId = rows[0]?.chatId
  if (!chatId) return 'not-connected'
  const ok = await sendTelegramMessage(
    chatId,
    '✅ <b>Bandomasis pranešimas</b>\nPranešimai veikia. Nauji signalai pagal tavo nustatymus ateis čia.',
  )
  return ok ? 'sent' : 'failed'
}
