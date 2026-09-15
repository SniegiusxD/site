/**
 * Resampling our own settled signals: each simulated bet draws the return of a
 * real, settled signal (won, lost or pushed at its real odds), so the spread of
 * outcomes is what our history actually produced. Nothing here is a forecast.
 */

/** Small seeded generator. The same seed draws the same scenarios on the server and in the browser. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Simulation = {
  /** Bet counts at which every path is sampled, from 0 to the last bet. */
  checkpoints: number[]
  /** One running result per scenario, sampled at the checkpoints. */
  paths: number[][]
  /** Final results, sorted from worst to best. */
  finals: number[]
  median: number
  p5: number
  p95: number
  shareNegative: number
  /** The scenario that ended closest to the median. */
  typical: number[]
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))]

export function simulate({
  returns,
  stake,
  bets,
  paths = 100,
  seed = 1,
  points = 60,
}: {
  returns: number[]
  stake: number
  bets: number
  paths?: number
  seed?: number
  points?: number
}): Simulation {
  const random = mulberry32(seed)
  const checkpoints = Array.from({ length: points + 1 }, (_, i) => Math.round((i / points) * bets))
  const all: number[][] = []
  for (let p = 0; p < paths; p++) {
    const path = [0]
    let total = 0
    let next = 1
    for (let bet = 1; bet <= bets; bet++) {
      total += stake * returns[Math.floor(random() * returns.length)]
      while (next < checkpoints.length && checkpoints[next] === bet) {
        path.push(Math.round(total * 100) / 100)
        next += 1
      }
    }
    while (path.length < checkpoints.length) path.push(Math.round(total * 100) / 100)
    all.push(path)
  }
  const finals = all.map((path) => path[path.length - 1]).sort((a, b) => a - b)
  const median = quantile(finals, 0.5)
  const typical = all.reduce((best, path) =>
    Math.abs(path[path.length - 1] - median) < Math.abs(best[best.length - 1] - median) ? path : best,
  )
  return {
    checkpoints,
    paths: all,
    finals,
    median,
    p5: quantile(finals, 0.05),
    p95: quantile(finals, 0.95),
    shareNegative: finals.filter((value) => value < 0).length / finals.length,
    typical,
  }
}

/**
 * How often a stretch of `bets` contains `streak` losses in a row, and the
 * median result of those stretches anyway.
 */
export function losingStreakOdds({
  returns,
  stake,
  bets,
  streak,
  paths = 200,
  seed = 7,
}: {
  returns: number[]
  stake: number
  bets: number
  streak: number
  paths?: number
  seed?: number
}): { share: number; medianWithStreak: number | null } {
  const random = mulberry32(seed)
  const finalsWithStreak: number[] = []
  for (let p = 0; p < paths; p++) {
    let run = 0
    let hit = false
    let total = 0
    for (let bet = 0; bet < bets; bet++) {
      const r = returns[Math.floor(random() * returns.length)]
      total += stake * r
      run = r < 0 ? run + 1 : 0
      if (run >= streak) hit = true
    }
    if (hit) finalsWithStreak.push(total)
  }
  finalsWithStreak.sort((a, b) => a - b)
  return {
    share: finalsWithStreak.length / paths,
    medianWithStreak: finalsWithStreak.length ? quantile(finalsWithStreak, 0.5) : null,
  }
}

/** Results of `count` separate stretches of `bets` each, e.g. 12 days or 12 months. */
export function sampleStretches({
  returns,
  stake,
  bets,
  count,
  seed = 11,
}: {
  returns: number[]
  stake: number
  bets: number
  count: number
  seed?: number
}): number[] {
  const random = mulberry32(seed)
  return Array.from({ length: count }, () => {
    let total = 0
    for (let bet = 0; bet < bets; bet++) total += stake * returns[Math.floor(random() * returns.length)]
    return Math.round(total * 100) / 100
  })
}
