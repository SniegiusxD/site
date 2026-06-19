import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  parseLineFromDescription,
  mapOpportunity,
  type BackendOpportunity,
} from '@/lib/map-opportunity'

describe('parseLineFromDescription (Phase 6 Lithuanian fallback)', () => {
  it('parses total over: "Suminis: Daugiau 173.5"', () => {
    const r = parseLineFromDescription('Suminis: Daugiau 173.5')
    expect(r.line).toBe(173.5)
    expect(r.side).toBe('over')
  })

  it('parses total under: "Mažiau 0.5"', () => {
    const r = parseLineFromDescription('Mažiau 0.5')
    expect(r.line).toBe(0.5)
    expect(r.side).toBe('under')
  })

  it('parses handicap: "Handikapas: Team -4.5"', () => {
    const r = parseLineFromDescription('Handikapas: Valencia Basket -4.5')
    expect(r.line).toBe(-4.5)
  })

  it('parses line in parentheses: "Team (-13)"', () => {
    const r = parseLineFromDescription('Real Madrid (-13)')
    expect(r.line).toBe(-13)
  })

  it('parses prop: "Samuel Basallo: Mažiau 0.5"', () => {
    const r = parseLineFromDescription('Samuel Basallo: Mažiau 0.5')
    expect(r.line).toBe(0.5)
    expect(r.side).toBe('under')
  })

  it('handles European comma decimals', () => {
    const r = parseLineFromDescription('Daugiau 210,5')
    expect(r.line).toBe(210.5)
    expect(r.side).toBe('over')
  })

  it('returns empty for non-numeric description', () => {
    const r = parseLineFromDescription('moneyline')
    expect(r.line).toBeUndefined()
  })
})

describe('mapOpportunity line handling', () => {
  const base: BackendOpportunity = {
    sport: 'BASKETBALL',
    bookmaker: 'TopSport',
    soft_odds: 1.9,
    edge: 0.05,
    kelly_fraction: 0.02,
  }

  it('uses explicit backend line when present', () => {
    const sig = mapOpportunity({
      ...base,
      type: 'total',
      pick: 'total_over',
      description: 'Suminis: Daugiau 178.5',
      line: 178.5,
    })
    expect(sig.line).toBe(178.5)
    expect(sig.marketType).toBe('total')
  })

  it('falls back to description when backend line missing (spread)', () => {
    const sig = mapOpportunity({
      ...base,
      type: 'spread',
      pick: 'spread_home',
      description: 'Handikapas: Valencia Basket -5.5',
    })
    expect(sig.line).toBe(-5.5)
  })

  it('parses prop line from description fallback', () => {
    const sig = mapOpportunity({
      ...base,
      type: 'prop',
      player: 'Pete Alonso',
      market: 'batter_hits',
      pick: 'Over 1.5',
      description: 'Pete Alonso: Over 1.5 (batter hits)',
    })
    expect(sig.line).toBe(1.5)
  })
})
