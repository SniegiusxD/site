import { pool } from '@/lib/db'
import { loadSignalCounts, type SignalCounts } from '@/lib/signal-counts'

export type PublicStats = SignalCounts & {
  /** Median value of the signals found in the last day; robust to one odd price. */
  medianEdge: number | null
  /** When the runner last wrote a cycle. */
  lastScanAt: string | null
}

/** Numbers the public pages may show: counts and timing only, never the signals themselves. */
export async function loadPublicStats(): Promise<PublicStats | null> {
  const counts = await loadSignalCounts()
  if (!counts) return null
  try {
    const [median, status] = await Promise.all([
      pool.query<{ median: number | null }>(
        `SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY best_edge) AS median
           FROM live_signal WHERE first_seen_at > NOW() - INTERVAL '24 hours'`,
      ),
      pool.query<{ updated_at: Date | null }>(`SELECT updated_at FROM runner_status WHERE id = 1`),
    ])
    const updated = status.rows[0]?.updated_at
    return {
      ...counts,
      medianEdge: median.rows[0]?.median === null || median.rows[0]?.median === undefined ? null : Number(median.rows[0].median),
      lastScanAt: updated ? new Date(updated).toISOString() : null,
    }
  } catch (error) {
    console.error('[public-stats]', error)
    return { ...counts, medianEdge: null, lastScanAt: null }
  }
}
