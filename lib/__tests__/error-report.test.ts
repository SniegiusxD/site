import { describe, expect, it } from 'vitest'
import { isNoise, parseErrorReport } from '@/lib/error-report'

describe('parseErrorReport', () => {
  it('keeps kind, message, the top of the stack and our own path', () => {
    const stack = Array.from({ length: 20 }, (_, i) => `at f${i}`).join('\n')
    const report = parseErrorReport({ kind: 'error', message: 'x is undefined', stack, path: '/signalai', digest: 'abc123' })
    expect(report).toMatchObject({ kind: 'error', message: 'x is undefined', path: '/signalai', digest: 'abc123' })
    expect(report?.stack?.split('\n')).toHaveLength(8)
  })

  it('drops queries, foreign paths and unknown kinds', () => {
    expect(parseErrorReport({ kind: 'error', message: 'm', path: '/signalai?token=secret' })?.path).toBeNull()
    expect(parseErrorReport({ kind: 'error', message: 'm', path: 'https://evil.example/' })?.path).toBeNull()
    expect(parseErrorReport({ kind: 'weird', message: 'm' })).toBeNull()
    expect(parseErrorReport({ kind: 'error', message: '   ' })).toBeNull()
  })
})

describe('isNoise', () => {
  it('filters extension and network noise, keeps real errors', () => {
    expect(isNoise({ message: 'ResizeObserver loop completed with undelivered notifications.', stack: null })).toBe(true)
    expect(isNoise({ message: 'boom', stack: 'at chrome-extension://abc/content.js:1' })).toBe(true)
    expect(isNoise({ message: 'Failed to fetch', stack: null })).toBe(true)
    expect(isNoise({ message: 'Cannot read properties of undefined (reading "odds")', stack: 'at SignalDetail' })).toBe(false)
  })
})
