import { describe, expect, it } from 'vitest'
import { errorFingerprint } from '@/lib/error-store'

const base = {
  source: 'client' as const,
  message: 'Cannot read properties of undefined (reading "odds")',
  stack: 'TypeError: Cannot read …\n    at SignalRow (signal-row.tsx:12:3)\n    at renderWithHooks (react-dom.js:1:1)',
  where: '/signalai',
}

describe('errorFingerprint', () => {
  it('groups the same error in the same place, whatever numbers the message carries', () => {
    expect(errorFingerprint({ ...base, message: 'Timeout after 1200 ms' })).toBe(
      errorFingerprint({ ...base, message: 'Timeout after 3400 ms' }),
    )
  })

  it('keeps apart different places, frames, sources and messages', () => {
    const id = errorFingerprint(base)
    expect(errorFingerprint({ ...base, where: '/statymai' })).not.toBe(id)
    expect(errorFingerprint({ ...base, stack: base.stack.replace('SignalRow', 'BetsView') })).not.toBe(id)
    expect(errorFingerprint({ ...base, source: 'server' })).not.toBe(id)
    expect(errorFingerprint({ ...base, message: 'Something else' })).not.toBe(id)
  })

  it('works without a stack or a place', () => {
    expect(errorFingerprint({ ...base, stack: null, where: null })).toMatch(/^[0-9a-f]{20}$/)
  })
})
