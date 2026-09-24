import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, errorFromBody, fetchJson, parseRetryAfter } from '@/lib/use-api'

describe('errorFromBody', () => {
  it("takes the server's own message", () => {
    expect(errorFromBody({ error: 'Per daug užklausų.' })).toBe('Per daug užklausų.')
  })

  it('ignores bodies without a usable message', () => {
    expect(errorFromBody(null)).toBeNull()
    expect(errorFromBody('text')).toBeNull()
    expect(errorFromBody({ error: '' })).toBeNull()
    expect(errorFromBody({ error: { code: 1 } })).toBeNull()
  })
})

describe('parseRetryAfter', () => {
  const now = new Date('2026-09-24T20:00:00Z')

  it('reads seconds', () => {
    expect(parseRetryAfter('30', now)).toBe(30)
  })

  it('reads an HTTP date as seconds from now, never negative', () => {
    expect(parseRetryAfter('Thu, 24 Sep 2026 20:01:30 GMT', now)).toBe(90)
    expect(parseRetryAfter('Thu, 24 Sep 2026 19:00:00 GMT', now)).toBe(0)
  })

  it('is null when absent or unreadable', () => {
    expect(parseRetryAfter(null, now)).toBeNull()
    expect(parseRetryAfter('soon', now)).toBeNull()
  })
})

describe('fetchJson', () => {
  afterEach(() => vi.unstubAllGlobals())

  const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(body === undefined ? 'not json' : JSON.stringify(body), { status, headers })),
    )

  it('returns the body and never uses the cache', async () => {
    respond(200, { bets: [] })
    await expect(fetchJson('/api/bets')).resolves.toEqual({ bets: [] })
    expect(fetch).toHaveBeenCalledWith('/api/bets', expect.objectContaining({ cache: 'no-store' }))
  })

  it("throws the server's message with the status", async () => {
    respond(403, { error: 'Reikia prenumeratos.' })
    await expect(fetchJson('/api/x')).rejects.toMatchObject({
      name: 'ApiError',
      message: 'Reikia prenumeratos.',
      serverMessage: 'Reikia prenumeratos.',
      status: 403,
    })
  })

  it('falls back to the status when the body is not JSON', async () => {
    respond(500, undefined)
    await expect(fetchJson('/api/x')).rejects.toMatchObject({ message: 'HTTP 500', serverMessage: null, status: 500 })
  })

  it('carries Retry-After on a 429', async () => {
    respond(429, { error: 'Per daug užklausų.' }, { 'Retry-After': '42' })
    const error = (await fetchJson('/api/x').catch((caught) => caught)) as ApiError
    expect(error.status).toBe(429)
    expect(error.retryAfter).toBe(42)
  })

  it('turns a network failure into status 0', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(fetchJson('/api/x')).rejects.toMatchObject({ status: 0 })
  })

  it('lets an abort through untouched, so callers can ignore it', async () => {
    const controller = new AbortController()
    const abort = new DOMException('Aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(abort)))
    controller.abort()
    await expect(fetchJson('/api/x', controller.signal)).rejects.toBe(abort)
  })
})
