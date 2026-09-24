import { describe, expect, it } from 'vitest'
import { trapTarget } from '@/lib/use-focus-trap'

describe('trapTarget', () => {
  it('wraps Tab from the last element to the first', () => {
    expect(trapTarget(2, 3, false)).toBe(0)
  })

  it('wraps Shift+Tab from the first element to the last', () => {
    expect(trapTarget(0, 3, true)).toBe(2)
  })

  it('leaves Tab alone in the middle', () => {
    expect(trapTarget(1, 3, false)).toBeNull()
    expect(trapTarget(1, 3, true)).toBeNull()
  })

  it('pulls focus back in when it is outside the dialog', () => {
    expect(trapTarget(-1, 3, false)).toBe(0)
    expect(trapTarget(-1, 3, true)).toBe(2)
  })

  it('does nothing in a dialog with nothing to focus', () => {
    expect(trapTarget(-1, 0, false)).toBeNull()
  })

  it('keeps focus on a single element', () => {
    expect(trapTarget(0, 1, false)).toBe(0)
    expect(trapTarget(0, 1, true)).toBe(0)
  })
})
