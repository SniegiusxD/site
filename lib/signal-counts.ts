import { pool } from '@/lib/db'
import { BOOKS, type BookName } from '@/lib/landing-signals'

export type SignalCounts = {
  /** Distinct signals each book published in the last day. */
  perBook: Partial<Record<BookName, number>>
  /** Distinct signals at any book in the same window. */
  any: number
}

/**
 * Live counts from the tables the VM publishes to. Null when the tables are
 * missing or the query fails: pages then show no count rather than a guess.
 */
export async function loadSignalCounts(): Promise<SignalCounts | null> {
  try {
    const [perBook, any] = await Promise.all([
      pool.query<{ book: string; signals: string }>(
        `SELECT p.book, COUNT(DISTINCT s.id) AS signals
           FROM live_signal s
           JOIN live_signal_price p ON p.signal_id = s.id AND p.published
          WHERE s.first_seen_at > NOW() - INTERVAL '24 hours'
          GROUP BY p.book`,
      ),
      pool.query<{ signals: string }>(`SELECT COUNT(*) AS signals FROM live_signal WHERE first_seen_at > NOW() - INTERVAL '24 hours'`),
    ])
    const counts: SignalCounts = { perBook: {}, any: Number(any.rows[0]?.signals ?? 0) }
    for (const row of perBook.rows) {
      if (BOOKS.includes(row.book as BookName)) counts.perBook[row.book as BookName] = Number(row.signals)
    }
    return counts.any > 0 ? counts : null
  } catch (error) {
    if ((error as { code?: string }).code !== '42P01') console.error('[signal-counts]', error)
    return null
  }
}
