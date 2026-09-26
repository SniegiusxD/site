import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DURATION, SPRING, stagger } from '@/lib/motion'

/**
 * Motion comes from lib/motion.ts so every moment moves alike
 * (planning/MOTION_AUDIT_2026-09-26.md). A component that defines its own
 * curve again drifts from the rest; this keeps them in one place.
 */

const ROOT = join(__dirname, '..', '..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

describe('motion tokens', () => {
  it('no component defines its own easing curve', () => {
    const offenders = files(join(ROOT, 'components'))
      .filter((path) => /\[0\.(22|16), 1, 0\.(36|3), 1\]|cubic-bezier\(0\.22, 1, 0\.36, 1\)/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(ROOT, path))
    expect(offenders).toEqual([])
  })

  it('keeps answers short and celebrations under a second', () => {
    expect(DURATION.tap).toBeLessThanOrEqual(0.2)
    expect(DURATION.celebrate).toBeLessThan(1)
    for (const spring of Object.values(SPRING)) expect(spring.type).toBe('spring')
  })

  it('caps a stagger so long lists do not crawl in', () => {
    expect(stagger(0)).toBe(0)
    expect(stagger(3)).toBeCloseTo(0.18)
    expect(stagger(500)).toBe(0.6)
  })
})
