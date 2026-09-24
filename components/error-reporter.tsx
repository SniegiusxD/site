'use client'

import { useEffect } from 'react'

const MAX_PER_PAGE = 5
let sent = 0

/** Sends one error to the log endpoint; never throws, never retries. */
export function reportError(kind: 'error' | 'unhandledrejection' | 'boundary', error: unknown, digest?: string) {
  if (sent >= MAX_PER_PAGE) return
  sent += 1
  const err = error instanceof Error ? error : null
  const body = JSON.stringify({
    kind,
    message: err?.message ?? String(error ?? 'Unknown error'),
    stack: err?.stack ?? null,
    path: window.location.pathname,
    digest: digest ?? null,
  })
  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon?.('/api/client-error', blob)) {
      void fetch('/api/client-error', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {})
    }
  } catch {
    // Reporting must never become the second error.
  }
}

/** Listens for uncaught errors and rejected promises across the whole site. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportError('error', event.error ?? event.message)
    const onRejection = (event: PromiseRejectionEvent) => reportError('unhandledrejection', event.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
