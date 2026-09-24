'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * One way to read JSON from our own API in the browser: GET, never cached,
 * aborted when the component goes away, and an error that carries what the
 * server said (its `error` field), the HTTP status and, for 429, how long to
 * wait. Components keep their own wording; lib/api-error.ts turns an error
 * into a sentence when they want the shared one.
 */

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never got an answer (offline, DNS, CORS). */
  readonly status: number
  /** Seconds the server asked us to wait (Retry-After), when it said. */
  readonly retryAfter: number | null
  /** The body's own `error` text, when the server sent one; screens show it over their default. */
  readonly serverMessage: string | null

  constructor(message: string, status: number, retryAfter: number | null = null, serverMessage: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
    this.serverMessage = serverMessage
  }
}

/** The server's own message from a JSON error body, when it sent one. */
export function errorFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const error = (body as { error?: unknown }).error
  return typeof error === 'string' && error.trim() ? error.trim() : null
}

/** Retry-After as seconds: either a number of seconds or an HTTP date. Null when absent or unreadable. */
export function parseRetryAfter(header: string | null, now: Date = new Date()): number | null {
  if (!header) return null
  const trimmed = header.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  const at = Date.parse(trimmed)
  if (Number.isNaN(at)) return null
  return Math.max(0, Math.ceil((at - now.getTime()) / 1000))
}

/** GET a JSON body, or throw an ApiError. An aborted request rejects with the AbortError as is. */
export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { cache: 'no-store', signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError('Nepavyko susisiekti su serveriu.', 0)
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const serverMessage = errorFromBody(body)
    throw new ApiError(serverMessage ?? `HTTP ${response.status}`, response.status, parseRetryAfter(response.headers.get('Retry-After')), serverMessage)
  }
  return body as T
}

const asApiError = (error: unknown) => (error instanceof ApiError ? error : new ApiError('Nepavyko įkelti.', 0))

type Settled<T> = { data: T | null; error: ApiError | null; request: string | null; at: number | null }

export type ApiState<T> = {
  /** The last good body; kept while a reload runs or after it fails. */
  data: T | null
  /** The last request's failure; cleared by the next success. */
  error: ApiError | null
  /** True from the first render until the current request settles. */
  loading: boolean
  /** Ask again (after a change, or from a retry button). */
  reload: () => void
  /** When the last request settled (ms), for "as of" times; null before the first. */
  settledAt: number | null
}

/**
 * `url` null means "not yet" (for example a dialog that is closed): nothing is
 * fetched and loading stays false.
 */
export function useApi<T>(url: string | null): ApiState<T> {
  const [attempt, setAttempt] = useState(0)
  const [settled, setSettled] = useState<Settled<T>>({ data: null, error: null, request: null, at: null })
  const request = url === null ? null : `${attempt}:${url}`

  useEffect(() => {
    if (url === null) return
    const controller = new AbortController()
    fetchJson<T>(url, controller.signal).then(
      (data) => setSettled({ data, error: null, request, at: Date.now() }),
      (error) => {
        if (controller.signal.aborted) return
        setSettled((current) => ({ data: current.data, error: asApiError(error), request, at: Date.now() }))
      },
    )
    return () => controller.abort()
  }, [url, request])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])

  return {
    data: settled.data,
    error: settled.error,
    loading: request !== null && settled.request !== request,
    reload,
    settledAt: settled.at,
  }
}
