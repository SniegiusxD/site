import { describe, expect, it } from 'vitest'
import { losingStreakOdds, mulberry32, sampleStretches, simulate } from '@/lib/simulate'

describe('mulberry32', () => {
  it('repeats for the same seed and stays in [0, 1)', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const draws = Array.from({ length: 1000 }, () => a())
    expect(draws.slice(0, 5)).toEqual(Array.from({ length: 5 }, () => b()))
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...draws)).toBeLessThan(1)
  })
})

describe('simulate', () => {
  it('is deterministic and samples every path at the checkpoints', () => {
    const input = { returns: [1, -1, 0.9, -1], stake: 10, bets: 300, paths: 20, seed: 3, points: 30 }
    const first = simulate(input)
    expect(simulate(input)).toEqual(first)
    expect(first.checkpoints[0]).toBe(0)
    expect(first.checkpoints.at(-1)).toBe(300)
    expect(first.paths.every((path) => path.length === 31 && path[0] === 0)).toBe(true)
    expect(first.finals).toEqual([...first.finals].sort((a, b) => a - b))
    expect(first.p5).toBeLessThanOrEqual(first.median)
    expect(first.median).toBeLessThanOrEqual(first.p95)
    expect(first.typical.at(-1)).toBe(first.paths.map((p) => p.at(-1)!).sort((x, y) => Math.abs(x - first.median) - Math.abs(y - first.median))[0])
  })

  it('adds stake × return for every bet', () => {
    const always = simulate({ returns: [0.5], stake: 10, bets: 100, paths: 5 })
    expect(always.finals).toEqual([500, 500, 500, 500, 500])
    expect(always.shareNegative).toBe(0)
    const never = simulate({ returns: [-1], stake: 4, bets: 25, paths: 3 })
    expect(never.shareNegative).toBe(1)
    expect(never.median).toBe(-100)
  })
})

describe('losingStreakOdds', () => {
  it('finds streaks only when losses can happen', () => {
    expect(losingStreakOdds({ returns: [-1], stake: 1, bets: 20, streak: 10, paths: 10 })).toEqual({ share: 1, medianWithStreak: -20 })
    expect(losingStreakOdds({ returns: [1], stake: 1, bets: 20, streak: 10, paths: 10 })).toEqual({ share: 0, medianWithStreak: null })
    const coin = losingStreakOdds({ returns: [1, -1], stake: 1, bets: 1000, streak: 10, paths: 200 })
    // A fair coin over 1,000 flips has a 10-loss run roughly 38 % of the time.
    expect(coin.share).toBeGreaterThan(0.2)
    expect(coin.share).toBeLessThan(0.6)
  })
})

describe('sampleStretches', () => {
  it('returns one total per stretch', () => {
    expect(sampleStretches({ returns: [0.25], stake: 8, bets: 10, count: 12 })).toEqual(Array(12).fill(20))
  })
})
