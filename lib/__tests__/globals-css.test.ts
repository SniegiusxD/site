import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every keyframe animation in the global stylesheet moves only what the GPU
 * composites (transform, opacity). Animating anything else repaints or lays
 * out the page every frame; on 2026-09-24 a looping gradient did exactly that.
 * See planning/PERFORMANCE_AND_RELIABILITY_2026-09-24.md.
 */

const COMPOSITED = new Set(['transform', 'opacity'])

/**
 * Deliberate exceptions, each short and one-shot, never on the landing page:
 * - row-new: a board row's 2.6 s background glow when a signal first appears.
 */
const ALLOWED: Record<string, string[]> = {
  'row-new': ['background-color'],
}

/** Each @keyframes name with the properties its steps set. Comments are ignored. */
function keyframeProperties(css: string): Map<string, Set<string>> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const found = new Map<string, Set<string>>()
  const start = /@keyframes\s+([\w-]+)\s*\{/g
  for (let match = start.exec(clean); match; match = start.exec(clean)) {
    let depth = 1
    let index = start.lastIndex
    while (depth > 0 && index < clean.length) {
      if (clean[index] === '{') depth++
      if (clean[index] === '}') depth--
      index++
    }
    const body = clean.slice(start.lastIndex, index - 1)
    const properties = new Set<string>()
    for (const block of body.match(/\{[^{}]*\}/g) ?? []) {
      for (const declaration of block.slice(1, -1).split(';')) {
        const property = declaration.split(':')[0]?.trim()
        if (property) properties.add(property)
      }
    }
    found.set(match[1], properties)
  }
  return found
}

describe('keyframeProperties', () => {
  it('reads the properties of each step, ignoring comments', () => {
    const css = `/* @keyframes fake { from { top: 0 } } */
      @keyframes a { from { opacity: 0; transform: none } 50%, 100% { opacity: 1 } }
      @keyframes b { to { top: 10px } }`
    expect(keyframeProperties(css)).toEqual(
      new Map([
        ['a', new Set(['opacity', 'transform'])],
        ['b', new Set(['top'])],
      ]),
    )
  })
})

describe('app/globals.css', () => {
  const keyframes = keyframeProperties(readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8'))

  it('has keyframes to check', () => {
    expect(keyframes.size).toBeGreaterThan(5)
  })

  it('animates only transform and opacity, apart from the listed exceptions', () => {
    const offenders = [...keyframes].flatMap(([name, properties]) =>
      [...properties].filter((property) => !COMPOSITED.has(property) && !(ALLOWED[name] ?? []).includes(property)).map((property) => `${name}: ${property}`),
    )
    expect(offenders).toEqual([])
  })

  it('keeps no stale exception', () => {
    for (const name of Object.keys(ALLOWED)) expect(keyframes.has(name), `${name} is allowed but no longer exists`).toBe(true)
  })
})
