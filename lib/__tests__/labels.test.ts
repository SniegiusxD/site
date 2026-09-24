import { describe, expect, it } from 'vitest'
import { beatShare, EVIDENCE, evidencePeriod } from '@/lib/evidence'
import { bandFor, marketLabel, ODDS_BANDS, PART_MARKETS, periodLabel, sportLabel } from '@/lib/signal-taxonomy'
import { sportName } from '@/lib/sports-lt'

describe('sportName', () => {
  it('names the sports in Lithuanian, whatever the case of the key', () => {
    expect(sportName('basketball')).toBe('Krepšinis')
    expect(sportName('ICE_HOCKEY')).toBe('Ledo ritulys')
    expect(sportName('soccer')).toBe('Futbolas')
  })

  it('shows an unknown key readably rather than as a code', () => {
    expect(sportName('aussie_rules')).toBe('Aussie rules')
  })
})

describe('signal taxonomy', () => {
  it('finds the odds band only for its exact range', () => {
    expect(bandFor(1, 2)?.key).toBe('short')
    expect(bandFor(3, 100)?.key).toBe('long')
    expect(bandFor(1.3, 6)).toBeNull()
  })

  it('has bands that meet end to end, so no odds fall between two', () => {
    const [, ...bands] = ODDS_BANDS
    for (let index = 1; index < bands.length; index++) expect(bands[index].min).toBe(bands[index - 1].max)
  })

  it('falls back to the key for labels it does not know', () => {
    expect(marketLabel('nope')).toBe('nope')
    expect(periodLabel('nope')).toBe('nope')
    expect(sportLabel('nope')).toBe('nope')
  })

  it('treats first-half and set markets as parts of a match', () => {
    expect(PART_MARKETS).toContain('moneyline_1h')
    expect(PART_MARKETS).not.toContain('moneyline')
  })
})

describe('evidence', () => {
  it('is the share of fixtures that beat the close, or nothing without closes', () => {
    expect(beatShare({ ...EVIDENCE, fixturesWithClosing: 40, fixturesBeatingClose: 22 })).toBeCloseTo(0.55)
    expect(beatShare({ ...EVIDENCE, fixturesWithClosing: 0, fixturesBeatingClose: 0 })).toBeNull()
  })

  it('names the window the numbers cover', () => {
    expect(evidencePeriod({ ...EVIDENCE, firstDate: '2026-09-09', lastDate: '2026-09-19' })).toBe('rugsėjo 9–19 d.')
    expect(evidencePeriod({ ...EVIDENCE, firstDate: '2026-08-30', lastDate: '2026-09-19' })).toBe('rugpjūčio 30 – rugsėjo 19 d.')
  })
})
