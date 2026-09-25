import { describe, expect, it } from 'vitest'
import { clvOf, parsePastSignal, selectionText, summarize, summarizeByBook, type PastSignal } from '@/lib/public-results'

const base: PastSignal = {
  id: 's1',
  sport: 'basketball',
  startsAt: '2026-09-24T18:00:00.000Z',
  market: 'spread',
  direction: 'away',
  line: 4.5,
  home: 'Žalgiris',
  away: 'Rytas',
  book: '7BET',
  odds: 2,
  edge: 0.05,
  closingFairProb: 0.52,
  outcome: null,
}

describe('clvOf', () => {
  it('is odds times the closing fair probability minus one', () => {
    expect(clvOf(base)).toBeCloseTo(0.04)
  })
  it('is null without a usable close', () => {
    expect(clvOf({ ...base, closingFairProb: null })).toBeNull()
    expect(clvOf({ ...base, closingFairProb: 0 })).toBeNull()
  })
})

describe('summarize', () => {
  it('counts closes, beats and a flat-stake return', () => {
    const rows: PastSignal[] = [
      { ...base, id: 'a', closingFairProb: 0.55, outcome: 'won' }, // clv +10 %, +1
      { ...base, id: 'b', closingFairProb: 0.45, outcome: 'lost' }, // clv -10 %, -1
      { ...base, id: 'c', closingFairProb: 0.6, outcome: 'half_won' }, // clv +20 %, +0.5
      { ...base, id: 'd', closingFairProb: null, outcome: 'push' }, // no close, 0
      { ...base, id: 'e', closingFairProb: 0.5, outcome: null }, // clv 0, not graded
    ]
    const summary = summarize(rows)
    expect(summary.signals).toBe(5)
    expect(summary.withClose).toBe(4)
    // A price equal to the close did not beat it.
    expect(summary.beatClose).toBeCloseTo(2 / 4)
    expect(summary.meanClv).toBeCloseTo((0.1 - 0.1 + 0.2 + 0) / 4)
    expect(summary).toMatchObject({ graded: 4, won: 2, lost: 1, other: 1 })
    expect(summary.roi).toBeCloseTo(0.5 / 4)
  })

  it('has no rates at all when nothing is measurable', () => {
    expect(summarize([{ ...base, closingFairProb: null }])).toMatchObject({ beatClose: null, meanClv: null, roi: null, graded: 0 })
  })

  it('by book keeps the given order and drops empty books', () => {
    const rows = [
      { ...base, book: 'TopSport' },
      { ...base, book: '7BET' },
    ]
    expect(summarizeByBook(rows, ['7BET', 'TopSport', 'Betsson']).map((row) => row.book)).toEqual(['7BET', 'TopSport'])
  })
})

describe('selectionText', () => {
  it.each([
    [{ market: 'spread', direction: 'away', line: 4.5 }, 'Rytas +4,5'],
    [{ market: 'spread', direction: 'home', line: -2.5 }, 'Žalgiris -2,5'],
    [{ market: 'total', direction: 'over', line: 160.5 }, 'Daugiau nei 160,5'],
    [{ market: 'total_1h', direction: 'under', line: 80 }, 'Mažiau nei 80 (1 kėlinys)'],
    [{ market: 'team_total', direction: 'home_over', line: 82.5 }, 'Žalgiris: daugiau nei 82,5'],
    [{ market: 'moneyline', direction: 'home', line: null }, 'Žalgiris laimės'],
    [{ market: 'moneyline_reg', direction: 'draw', line: null }, 'Lygiosios'],
    [{ market: 'moneyline_reg', direction: 'away', line: null }, 'Rytas laimės (reguliarus laikas)'],
    [{ market: 'corner_total', direction: 'under', line: 9.5 }, 'Kampiniai: mažiau nei 9,5'],
    [{ market: 'spreads_sets', direction: 'away', line: 1.5 }, 'Rytas +1,5 (setai)'],
  ])('%o', (fields, text) => {
    expect(selectionText({ ...base, ...fields })).toBe(text)
  })

  it('never shows an empty team name', () => {
    expect(selectionText({ ...base, home: null, market: 'moneyline', direction: 'home' })).toBe('Namų komanda laimės')
  })
})

describe('parsePastSignal', () => {
  const row = {
    id: 'ls2_x',
    sport: 'tennis',
    starts_at: new Date('2026-09-24T10:00:00Z'),
    market: 'moneyline',
    direction: 'home',
    line: null,
    home: 'A',
    away: 'B',
    best_book: 'TopSport',
    best_odds: 1.9,
    best_edge: 0.03,
    closing_fair_prob: 0.55,
    outcome: 'won',
  }
  it('reads a VM row', () => {
    expect(parsePastSignal(row)).toMatchObject({ id: 'ls2_x', startsAt: '2026-09-24T10:00:00.000Z', odds: 1.9, closingFairProb: 0.55, outcome: 'won' })
  })
  it('drops rows it cannot price and ignores unknown outcomes and impossible closes', () => {
    expect(parsePastSignal({ ...row, best_odds: null })).toBeNull()
    expect(parsePastSignal({ ...row, outcome: 'cancelled', closing_fair_prob: 1.4 })).toMatchObject({ outcome: null, closingFairProb: null })
  })
})
