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
}

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
}

export async function loadTelegramState(userId: string): Promise<TelegramState> {
  await ensureAppSchema()
  const { rows } = await pool.query<AccountRow>(
    `SELECT "chatId"::text AS "chatId", username, "linkedAt", enabled, "minEdge", "maxHoursToStart",
            books, sports, markets, periods, "minOdds", "maxOdds", "quietStart", "quietEnd"
       FROM telegram_account WHERE "userId" = $1`,
    [userId],
  )
  const row = rows[0]
  const botUsername = await getBotUsername()
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
  }
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
