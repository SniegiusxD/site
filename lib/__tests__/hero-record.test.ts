import { describe, expect, it } from 'vitest'
import { heroRecordSignals } from '@/lib/hero-record'
import type { PastSignal } from '@/lib/public-results'

const now = new Date('2026-09-25T12:00:00Z')
const signal = (over: Partial<PastSignal>): PastSignal => ({
  id: 'a', sport: 'basketball', startsAt: '2026-09-25T10:00:00Z', market: 'total', direction: 'over', line: 160.5,
  home: 'Klaipėda', away: 'Šiauliai', book: '7BET', odds: 2.1, edge: 0.05, closingFairProb: 0.52, outcome: null, ...over,
})

describe('heroRecordSignals', () => {
  it('turns a started signal into price, close and CLV', () => {
    const [row] = heroRecordSignals([signal({})], now)
    expect(row.event).toBe('Klaipėda – Šiauliai')
    expect(row.odds).toBe(2.1)
    expect(row.closeOdds).toBeCloseTo(1 / 0.52)
    expect(row.clv).toBeCloseTo(0.092)
  })

  it('never names the bookmaker', () => {
    const rows = heroRecordSignals([signal({})], now)
    expect(Object.keys(rows[0])).not.toContain('book')
    expect(JSON.stringify(rows)).not.toContain('7BET')
  })

  it('drops signals that have not started and those without a close', () => {
    const rows = heroRecordSignals(
      [signal({ id: 'future', startsAt: '2026-09-25T13:00:00Z' }), signal({ id: 'noclose', closingFairProb: null }), signal({ id: 'ok' })],
      now,
    )
    expect(rows.map((row) => row.id)).toEqual(['ok'])
  })

  it('is empty without data', () => {
    expect(heroRecordSignals(null, now)).toEqual([])
    expect(heroRecordSignals([], now)).toEqual([])
  })
})
