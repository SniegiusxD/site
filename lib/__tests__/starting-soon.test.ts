import { describe, expect, it } from 'vitest'
import { soonMinutes } from '@/components/app/board/starting-soon'

const now = new Date('2026-09-26T18:00:00Z')

describe('soonMinutes', () => {
  it('is set only in the last 15 minutes before kickoff', () => {
    expect(soonMinutes('2026-09-26T18:10:00Z', now)).toBe(10)
    expect(soonMinutes('2026-09-26T18:15:00Z', now)).toBe(15)
    expect(soonMinutes('2026-09-26T18:16:00Z', now)).toBeNull()
    expect(soonMinutes('2026-09-26T18:00:00Z', now)).toBeNull()
    expect(soonMinutes('2026-09-26T17:50:00Z', now)).toBeNull()
  })
})
