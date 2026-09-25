import { describe, expect, it } from 'vitest'
import { boardStake } from '@/lib/exposure'
import { daysTo, recordPeriodLabel, simulationStake, timeLabel, TRACK_RECORD } from '@/lib/pace'
import { parseSettings, suggestedStake } from '@/lib/preferences'

const prefs = { bankroll: 1000, kellyFraction: 0.25, bookLimits: {} }
const none = { selection: { count: 0, staked: 0 }, match: { count: 0, staked: 0 } }

describe('suggestedStake', () => {
  it('stakes the member’s share of full Kelly, rounded down to whole euros', () => {
    // 2,10 against a fair 2,00: full Kelly (1.1 × 0.5 − 0.5) / 1.1 = 4.545 %; a quarter is 1.136 % of 1 000 €.
    expect(suggestedStake(prefs, '7BET', 2.1, 2)).toBe(11)
  })

  it('never stakes more than 5 % of the bankroll, whatever Kelly says', () => {
    expect(suggestedStake({ ...prefs, kellyFraction: 1 }, '7BET', 3, 2)).toBe(50)
  })

  it('respects the member’s limit at that book only', () => {
    expect(suggestedStake({ ...prefs, bookLimits: { '7BET': 3 } }, '7BET', 2.1, 2)).toBe(3)
    expect(suggestedStake({ ...prefs, bookLimits: { '7BET': 3 } }, 'TopSport', 2.1, 2)).toBe(11)
  })

  it('a fixed amount replaces Kelly, still under the 5 % ceiling and the book limit', () => {
    const fixed = { ...prefs, fixedStake: 7 }
    // Same 7 € whatever the value: a small edge and a big one.
    expect(suggestedStake(fixed, '7BET', 2.1, 2)).toBe(7)
    expect(suggestedStake(fixed, '7BET', 3, 2)).toBe(7)
    expect(suggestedStake({ ...prefs, fixedStake: 80 }, '7BET', 2.1, 2)).toBe(50)
    expect(suggestedStake({ ...fixed, bookLimits: { TopSport: 4 } }, 'TopSport', 2.1, 2)).toBe(4)
    // No value, no stake, fixed amount or not.
    expect(suggestedStake(fixed, '7BET', 1.9, 2)).toBe(0)
  })

  it('a second bet on the same selection only gets what is left of the fixed amount', () => {
    const exposed = { selection: { count: 1, staked: 5 }, match: { count: 1, staked: 5 } }
    expect(boardStake({ ...prefs, fixedStake: 7 }, { fairOdds: 2 }, { book: 'TopSport', odds: 2.1 }, exposed).suggested).toBe(2)
  })

  it('stakes nothing without an edge or with impossible prices', () => {
    expect(suggestedStake(prefs, '7BET', 1.9, 2)).toBe(0)
    expect(suggestedStake(prefs, '7BET', 1, 2)).toBe(0)
    expect(suggestedStake(prefs, '7BET', 2, 1)).toBe(0)
  })
})

describe('boardStake', () => {
  it('suggests only what is left of the Kelly stake on a selection already bet', () => {
    const stake = boardStake(prefs, { fairOdds: 2 }, { book: '7BET', odds: 2.1 }, { ...none, selection: { count: 1, staked: 8 } })
    expect(stake).toMatchObject({ kelly: 11, remaining: 3, suggested: 3, directionFull: false })
  })

  it('says the direction is full once the Kelly stake is placed', () => {
    const stake = boardStake(prefs, { fairOdds: 2 }, { book: '7BET', odds: 2.1 }, { ...none, selection: { count: 2, staked: 12 } })
    expect(stake).toMatchObject({ remaining: 0, suggested: 0, directionFull: true })
  })

  it('applies the book limit after the remainder', () => {
    const stake = boardStake({ ...prefs, bookLimits: { '7BET': 2 } }, { fairOdds: 2 }, { book: '7BET', odds: 2.1 }, none)
    expect(stake.suggested).toBe(2)
  })
})

describe('pace', () => {
  it('writes minutes, whole hours and half hours the Lithuanian way', () => {
    expect(timeLabel(45)).toBe('45 min')
    expect(timeLabel(60)).toBe('1 val.')
    expect(timeLabel(90)).toBe('1,5 val.')
  })

  it('counts whole days, and treats a zero pace as one a day', () => {
    expect(daysTo(100, 10)).toBe(10)
    expect(daysTo(101, 10)).toBe(11)
    expect(daysTo(5, 0)).toBe(5)
  })

  it('keeps the scenario stake between 1 € and 5 % of the bankroll', () => {
    expect(simulationStake(10, 0.25)).toBe(1)
    expect(simulationStake(1000, 100)).toBe(50)
    expect(simulationStake(1000, 0.25)).toBe(Math.floor(1000 * TRACK_RECORD.medianFullKelly * 0.25))
  })

  it('names the record window within one month or across two', () => {
    expect(recordPeriodLabel('2026-09-06', '2026-09-14')).toBe('rugsėjo 6–14 d.')
    expect(recordPeriodLabel('2026-08-28', '2026-09-14')).toBe('rugpjūčio 28 d. – rugsėjo 14 d.')
  })
})

describe('parseSettings fixedStake', () => {
  const base = { books: ['7BET'], minEdge: 0.02, minOdds: 1.3, maxOdds: 6, maxHoursToStart: 48, kellyFraction: 0.25 }
  it('is null when not sent, so older clients keep value sizing', () => {
    expect(parseSettings(base)).toMatchObject({ ok: true, value: { fixedStake: null } })
  })
  it('rounds to whole euros and refuses amounts outside 1..100 000', () => {
    expect(parseSettings({ ...base, fixedStake: 5.4 })).toMatchObject({ ok: true, value: { fixedStake: 5 } })
    expect(parseSettings({ ...base, fixedStake: 0 }).ok).toBe(false)
    expect(parseSettings({ ...base, fixedStake: '5' }).ok).toBe(false)
  })
})
