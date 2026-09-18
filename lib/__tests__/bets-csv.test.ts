import { describe, expect, it } from 'vitest'
import { betsToCsv, csvFileName } from '@/lib/bets-csv'
import type { ActiveBet } from '@/lib/types'

const bet = (over: Partial<ActiveBet> = {}): ActiveBet =>
  ({
    id: 'b', signalId: 's', sport: 'TENNIS', match: 'A vs B', betDescription: 'Suminis: Daugiau 12,5',
    bookmaker: '7BET', odds: 1.95, stake: 7.5, status: 'laimeta', placedAt: '', placedAtIso: '2026-09-18T10:11:12.000Z',
    profit: 7.13, marketType: 'total', entryFairProb: 0.5, closingFairProb: 0.52, eventKey: 'pin-1',
    settledAtIso: null, canonicalOutcome: null, shownOdds: 1.9, ...over,
  }) as ActiveBet

describe('betsToCsv', () => {
  it('writes a header, a BOM and semicolons', () => {
    const csv = betsToCsv([bet()])
    expect(csv.startsWith('\ufeffData;')).toBe(true)
    expect(csv.split('\n')[1].split(';')[0]).toBe('2026-09-18 10:11:12')
  })

  it('writes decimals with a comma, the way a Lithuanian spreadsheet reads them', () => {
    const row = betsToCsv([bet()]).split('\n')[1]
    expect(row).toContain('1,95')
    expect(row).toContain('7,5')
  })

  it('quotes a field containing a semicolon', () => {
    const row = betsToCsv([bet({ match: 'A; B vs C' })]).split('\n')[1]
    // The export writes matches the way the app shows them, with an en dash.
    expect(row).toContain('"A; B – C"')
  })

  it('leaves missing numbers empty rather than writing zero', () => {
    const row = betsToCsv([bet({ profit: null, shownOdds: null })]).split('\n')[1].split(';')
    expect(row[6]).toBe('')
    expect(row[9]).toBe('')
  })

  it('names the file by the day', () => {
    expect(csvFileName(new Date('2026-09-19T08:00:00Z'))).toBe('statyk-statymai-2026-09-19.csv')
  })
})
