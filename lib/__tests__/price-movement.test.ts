import { describe, expect, it } from 'vitest'
import { driftOf, pollPulses } from '@/lib/price-movement'

const signal = (id: string, ...prices: Array<[string, number]>) => ({ id, prices: prices.map(([book, odds]) => ({ book, odds })) })

describe('pollPulses', () => {
  it('marks a signal that was not on the previous board as new', () => {
    expect(pollPulses([signal('a', ['7BET', 2])], [signal('a', ['7BET', 2]), signal('b', ['TopSport', 1.9])])).toEqual(
      new Map([['b', 'new']]),
    )
  })

  it('flashes a moved price up or down per book', () => {
    const pulses = pollPulses([signal('a', ['7BET', 2], ['TopSport', 1.9])], [signal('a', ['7BET', 2.1], ['TopSport', 1.85])])
    expect(pulses).toEqual(
      new Map([
        ['a:7BET', 'up'],
        ['a:TopSport', 'down'],
      ]),
    )
  })

  it('ignores rounding under half a cent', () => {
    expect(pollPulses([signal('a', ['7BET', 2])], [signal('a', ['7BET', 2.004])]).size).toBe(0)
  })

  it('does not flash a book that only just started quoting', () => {
    expect(pollPulses([signal('a', ['7BET', 2])], [signal('a', ['7BET', 2], ['Betsson', 2.2])]).size).toBe(0)
  })
})

describe('driftOf', () => {
  it('is the change from the first price as a fraction', () => {
    expect(driftOf({ first: 2, last: 1.9, seen: 3, firstAt: '', lastAt: '' })).toBeCloseTo(-0.05)
  })
})
