import { describe, expect, it } from 'vitest'
import { edgeOf, formatEdge, formatEuro, formatInteger, formatOdds, formatPercent, kellyFraction, ltPlural } from '@/lib/format-lt'

const NBSP = ' '

describe('ltPlural', () => {
  const word = (count: number) => ltPlural(count, 'signalas', 'signalai', 'signalų')

  it('uses the singular for 1, 21, 101 but not 11 or 111', () => {
    for (const count of [1, 21, 31, 101, 1001]) expect(word(count), String(count)).toBe('signalas')
    for (const count of [11, 111]) expect(word(count), String(count)).toBe('signalų')
  })

  it('uses the plural for 2–9 and 22–29, but not 12–19', () => {
    for (const count of [2, 5, 9, 22, 29, 102]) expect(word(count), String(count)).toBe('signalai')
    for (const count of [12, 15, 19, 112]) expect(word(count), String(count)).toBe('signalų')
  })

  it('uses the genitive for 0, 10, 20, 100 and the teens', () => {
    for (const count of [0, 10, 13, 20, 30, 100]) expect(word(count), String(count)).toBe('signalų')
  })

  it('reads negative counts by their size', () => {
    expect(word(-1)).toBe('signalas')
    expect(word(-3)).toBe('signalai')
  })
})

describe('formatEuro', () => {
  it('puts the euro sign after the amount with a non-breaking space', () => {
    expect(formatEuro(25)).toBe(`25${NBSP}€`)
  })

  it('rounds half away from zero to whole euros by default', () => {
    expect(formatEuro(2.5)).toBe(`3${NBSP}€`)
    expect(formatEuro(2.49)).toBe(`2${NBSP}€`)
  })

  it('keeps cents when asked, with a decimal comma', () => {
    expect(formatEuro(12.345, 2)).toBe(`12,35${NBSP}€`)
  })

  it('groups thousands with a non-breaking space, so a server and a browser print the same', () => {
    expect(formatEuro(1234567)).toBe(`1${NBSP}234${NBSP}567${NBSP}€`)
    expect(formatEuro(1234567)).not.toMatch(/[   ]/)
  })

  it('writes a loss with a minus sign', () => {
    expect(formatEuro(-3)).toBe(`−3${NBSP}€`)
  })
})

describe('formatEdge', () => {
  it('signs value and keeps one decimal', () => {
    expect(formatEdge(0.049)).toBe(`+4,9${NBSP}%`)
    expect(formatEdge(-0.12345)).toBe(`−12,3${NBSP}%`)
  })

  it('shows zero without a sign, including tiny values either side', () => {
    expect(formatEdge(0)).toBe(`0,0${NBSP}%`)
    expect(formatEdge(0.0004)).toBe(`0,0${NBSP}%`)
    expect(formatEdge(-0.0004)).toBe(`0,0${NBSP}%`)
  })
})

describe('formatOdds, formatPercent, formatInteger', () => {
  it('always shows odds with two decimals', () => {
    expect(formatOdds(2)).toBe('2,00')
    expect(formatOdds(1.955)).toMatch(/^1,9[56]$/)
  })

  it('formats an unsigned percentage', () => {
    expect(formatPercent(0.014)).toBe(`1,4${NBSP}%`)
    expect(formatPercent(0.5, 0)).toBe(`50${NBSP}%`)
  })

  it('rounds integers and groups with a non-breaking space', () => {
    expect(formatInteger(10000)).toBe(`10${NBSP}000`)
    expect(formatInteger(3692.6)).toBe(`3${NBSP}693`)
  })
})

describe('edgeOf and kellyFraction', () => {
  it('measures the book price against the fair price', () => {
    expect(edgeOf(2.2, 2)).toBeCloseTo(0.1)
    expect(edgeOf(1.9, 2)).toBeCloseTo(-0.05)
  })

  it('gives the full Kelly share for a real edge', () => {
    // b = 1, p = 0.55: (0.55 - 0.45) / 1
    expect(kellyFraction(2, 0.55)).toBeCloseTo(0.1)
  })

  it('never stakes on no edge, a negative one, or odds of 1 and below', () => {
    expect(kellyFraction(2, 0.5)).toBe(0)
    expect(kellyFraction(2, 0.4)).toBe(0)
    expect(kellyFraction(1, 0.9)).toBe(0)
    expect(kellyFraction(0.5, 0.9)).toBe(0)
  })
})
