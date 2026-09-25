import { describe, expect, it } from 'vitest'
import { DURATION, PRESET, SPRING } from '@/lib/motion'

/** What a preset may animate: the properties the GPU composites. */
const COMPOSITED = new Set(['x', 'y', 'scale', 'scaleX', 'scaleY', 'rotate', 'opacity'])
const STATES = ['initial', 'animate', 'exit', 'whileTap', 'whileHover'] as const
const TRANSITION = new Set(['duration', 'ease', 'delay', 'type', 'stiffness', 'damping', 'mass'])

describe('motion presets', () => {
  for (const [name, preset] of Object.entries(PRESET)) {
    it(`${name} animates only transform and opacity`, () => {
      for (const state of STATES) {
        const values = (preset as Record<string, object | undefined>)[state]
        for (const key of Object.keys(values ?? {})) expect(COMPOSITED, `${name}.${state}.${key}`).toContain(key)
      }
      for (const key of Object.keys(preset.transition)) expect(TRANSITION, `${name}.transition.${key}`).toContain(key)
    })
  }

  it('springs only carry spring settings', () => {
    for (const spring of Object.values(SPRING)) for (const key of Object.keys(spring)) expect(TRANSITION).toContain(key)
  })

  it('answers stay short and celebrations stay under 900 ms', () => {
    expect(DURATION.tap).toBeLessThanOrEqual(0.35)
    expect(DURATION.quick).toBeLessThanOrEqual(0.35)
    expect(DURATION.settle).toBeLessThanOrEqual(0.35)
    expect(DURATION.celebrate).toBeLessThanOrEqual(0.9)
  })
})
