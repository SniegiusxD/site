import { describe, expect, it, vi } from 'vitest'
import type { Health } from '@/lib/health'
import { cachedPublicHealth, HEALTHY_CACHE_SECONDS, type HealthStore } from '@/lib/health-cache'

vi.mock('@/lib/rate-limit', () => ({ upstashCredentials: () => null }))

const ok: Health = {
  ok: true, database: true, lastPublishedAt: '2026-09-28T20:00:00.000Z', minutesSincePublish: 3,
  lastResultAt: '2026-09-28T19:52:00.000Z', problem: null,
}
const stale: Health = { ...ok, ok: false, problem: 'stale', minutesSincePublish: 140 }

function memory(): HealthStore & { data: Map<string, unknown>; sets: number } {
  const data = new Map<string, unknown>()
  return {
    data, sets: 0,
    async get(key) { return data.get(key) ?? null },
    async set(key, value, options) { this.sets++; expect(options.ex).toBe(HEALTHY_CACHE_SECONDS); data.set(key, value) },
  }
}

describe('cachedPublicHealth', () => {
  it('serves a healthy answer from the cache without touching the database', async () => {
    const store = memory()
    const load = vi.fn(async () => ({ ...ok, host: { cycleSeconds: 1, diskPercent: 1, memoryMb: 1, warnings: [] } }))
    expect((await cachedPublicHealth(load, store)).host).toBeUndefined()
    const second = await cachedPublicHealth(load, store)
    expect(load).toHaveBeenCalledTimes(1)
    expect(second.cached).toBe(true)
    expect(second.host).toBeUndefined()
  })

  it('never caches a failure, so alerts are not delayed or kept after recovery', async () => {
    const store = memory()
    const load = vi.fn(async () => ({ ...stale }))
    await cachedPublicHealth(load, store)
    await cachedPublicHealth(load, store)
    expect(load).toHaveBeenCalledTimes(2)
    expect(store.sets).toBe(0)
  })

  it('falls back to the database when Redis fails', async () => {
    const broken: HealthStore = { get: async () => { throw new Error('down') }, set: async () => { throw new Error('down') } }
    const load = vi.fn(async () => ({ ...ok }))
    expect((await cachedPublicHealth(load, broken)).ok).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('works without Redis at all', async () => {
    const load = vi.fn(async () => ({ ...ok }))
    expect((await cachedPublicHealth(load, null)).ok).toBe(true)
  })
})
