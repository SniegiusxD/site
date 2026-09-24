/**
 * Browser errors, reported to /api/client-error and written to the function
 * log as one JSON line each, so `vercel logs … | grep client-error` finds every
 * crash a visitor saw. No third party, no personal data: the message, the top
 * of the stack, the page path and the release.
 */

export type ErrorReport = {
  kind: 'error' | 'unhandledrejection' | 'boundary'
  message: string
  stack: string | null
  path: string | null
  digest: string | null
}

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : null)

export function parseErrorReport(input: unknown): ErrorReport | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const kind = raw.kind === 'error' || raw.kind === 'unhandledrejection' || raw.kind === 'boundary' ? raw.kind : null
  const message = clip(raw.message, 500)?.trim()
  if (!kind || !message) return null
  // Only our own path, without the query: a query can carry ids or tokens.
  const path = typeof raw.path === 'string' && /^\/[\w\-/]{0,100}$/.test(raw.path) ? raw.path : null
  const stack = clip(raw.stack, 2000)?.split('\n').slice(0, 8).join('\n') ?? null
  const digest = typeof raw.digest === 'string' && /^[\w-]{1,40}$/.test(raw.digest) ? raw.digest : null
  return { kind, message, stack, path, digest }
}

/**
 * Noise every site receives from extensions, old browsers and cancelled
 * requests. Dropped before logging so real errors stay findable.
 */
export function isNoise(report: Pick<ErrorReport, 'message' | 'stack'>): boolean {
  const text = `${report.message}\n${report.stack ?? ''}`
  return /ResizeObserver loop|chrome-extension:|moz-extension:|safari-extension:|^Script error\.?$|AbortError|The operation was aborted|Load failed|NetworkError when attempting to fetch|Failed to fetch/im.test(text)
}
