import { describe, expect, it } from 'vitest'
import { parseBetInput } from '@/lib/bet-input'

const valid = {
  signalId: 'ls_abc',
  sport: 'basketball',
  match: 'VEF Riga – Absheron Lions',
  betDescription: 'Taškų suma: Daugiau nei 171,5',
  bookmaker: 'Betsson',
  odds: 1.95,
  stake: 7.5,
  marketType: 'total',
  line: 171.5,
  startsAt: new Date().toISOString(),
  entryFairProb: 0.51,
}

describe('parseBetInput', () => {
  it('accepts a real bet', () => {
    const result = parseBetInput(valid)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.bookmaker).toBe('Betsson')
      expect(result.value.marketType).toBe('total')
      expect(result.value.entryFairProb).toBeCloseTo(0.51)
    }
  })

  it('refuses an unknown bookmaker', () => {
    expect(parseBetInput({ ...valid, bookmaker: 'Optibet' }).ok).toBe(false)
    expect(parseBetInput({ ...valid, bookmaker: '<script>' }).ok).toBe(false)
  })

  it('bounds odds and stake', () => {
    expect(parseBetInput({ ...valid, odds: 1 }).ok).toBe(false)
    expect(parseBetInput({ ...valid, odds: 5000 }).ok).toBe(false)
    expect(parseBetInput({ ...valid, stake: 0 }).ok).toBe(false)
    expect(parseBetInput({ ...valid, stake: 1e9 }).ok).toBe(false)
    expect(parseBetInput({ ...valid, odds: 'nine' }).ok).toBe(false)
  })

  it('falls back on unknown sports and markets instead of storing them', () => {
    const result = parseBetInput({ ...valid, sport: 'curling', marketType: 'made_up' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.sport).toBe('OTHER')
      expect(result.value.marketType).toBe('other')
    }
  })

  it('cuts long text rather than storing it', () => {
    const result = parseBetInput({ ...valid, match: 'A'.repeat(5000) })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.match.length).toBe(200)
  })

  it('refuses a missing match and a broken kick-off', () => {
    expect(parseBetInput({ ...valid, match: '   ' }).ok).toBe(false)
    expect(parseBetInput({ ...valid, startsAt: 'not a date' }).ok).toBe(false)
    expect(parseBetInput({ ...valid, startsAt: '1999-01-01T00:00:00Z' }).ok).toBe(false)
    expect(parseBetInput(null).ok).toBe(false)
  })
})
