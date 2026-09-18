import { describe, expect, it } from 'vitest'
import { DEFAULT_TELEGRAM_SETTINGS, parseTelegramSettings } from '@/lib/telegram-settings'

describe('parseTelegramSettings', () => {
  it('accepts the defaults and orders books', () => {
    const result = parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, books: ['Betsson', '7BET', 'Optibet'] })
    expect(result.ok && result.value.books).toEqual(['7BET', 'Betsson'])
  })

  it('accepts quiet hours across midnight and rejects equal or half-set hours', () => {
    expect(parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, quietStart: 23, quietEnd: 7 }).ok).toBe(true)
    expect(parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, quietStart: 8, quietEnd: 8 }).ok).toBe(false)
    expect(parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, quietStart: 8, quietEnd: null }).ok).toBe(false)
    expect(parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, quietStart: 24, quietEnd: 3 }).ok).toBe(false)
  })

  it('rejects no books, bad edges and bad windows', () => {
    expect(parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, books: [] }).ok).toBe(false)
    expect(parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, minEdge: 0.5 }).ok).toBe(false)
    expect(parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, maxHoursToStart: 0 }).ok).toBe(false)
    expect(parseTelegramSettings({ ...DEFAULT_TELEGRAM_SETTINGS, enabled: 'yes' }).ok).toBe(false)
  })
})
