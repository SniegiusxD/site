import { Redis } from '@upstash/redis'
import type { Health } from '@/lib/health'
import { upstashCredentials } from '@/lib/rate-limit'

/**
 * The public health answer, reused for a few minutes when it was healthy.
 *
 * The GitHub monitor asks every 30 minutes and each answer queried Neon, so it
 * alone woke the free-tier database (5-minute suspend, 100 CU-h/month, 80 %
 * used on 2026-09-28) up to 48 extra times a day. A healthy answer is kept for
 * 10 minutes; the monitor's thresholds are 90 minutes (scanner) and 24 hours
 * (results), so this cannot hide a failure for long. A failure is never
 * cached: it is recomputed on every request, so an alert is neither delayed
 * nor kept alive after recovery.
 */
export const HEALTHY_CACHE_SECONDS = 600
const KEY = 'statyk:health:public:v1'

export type HealthStore = {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown, options: { ex: number }): Promise<unknown>
}

let shared: HealthStore | null | undefined
function defaultStore(): HealthStore | null {
  if (shared === undefined) {
    const credentials = upstashCredentials()
    shared = credentials ? (new Redis(credentials) as unknown as HealthStore) : null
  }
  return shared
}

export async function cachedPublicHealth(
  load: () => Promise<Health>,
  store: HealthStore | null = defaultStore(),
): Promise<Health & { cached?: boolean }> {
  if (store) {
    try {
      const hit = (await store.get(KEY)) as Health | null
      if (hit && hit.ok === true) return { ...hit, cached: true }
    } catch {
      // Redis down: answer from the database like before.
    }
  }
  const health = await load()
  delete health.host
  if (store && health.ok) {
    try {
      await store.set(KEY, health, { ex: HEALTHY_CACHE_SECONDS })
    } catch {
      // Caching is an optimisation only.
    }
  }
  return health
}
