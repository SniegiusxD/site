import type { ExecutionKind } from '@/lib/execution-events'
import type { LivePrice, LiveSignal } from '@/lib/live-signals'

/**
 * Tells the site a member took a step towards betting a signal. keepalive lets
 * the request finish while the bookmaker opens in a new tab; any failure is
 * ignored, because measuring must never get in the member's way.
 */
export function reportExecution(kind: ExecutionKind, signal: Pick<LiveSignal, 'id' | 'firstSeenAt'>, price: Pick<LivePrice, 'book' | 'odds' | 'edge'>) {
  try {
    void fetch('/api/execution', {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signalId: signal.id,
        book: price.book,
        kind,
        shownOdds: price.odds,
        shownEdge: price.edge,
        firstSeenAt: signal.firstSeenAt,
      }),
    }).catch(() => {})
  } catch {
    // fetch itself can throw synchronously on a malformed request; ignore it too.
  }
}
