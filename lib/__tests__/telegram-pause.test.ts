import { describe, expect, it } from 'vitest'
import { nextMorning } from '@/app/api/telegram/pause/route'

/** Vilnius is UTC+3 in September, so 05:00 UTC is 08:00 there. */
const vilniusHour = (date: Date) =>
  Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vilnius', hour: '2-digit', hourCycle: 'h23' }).format(date),
  )

describe('nextMorning', () => {
  it('lands on 8 in the morning, Vilnius time', () => {
    for (const iso of ['2026-09-19T20:31:00Z', '2026-09-19T01:10:00Z', '2026-01-05T23:59:00Z', '2026-06-30T04:59:00Z']) {
      const until = nextMorning(new Date(iso))
      expect(vilniusHour(until), iso).toBe(8)
      expect(until.getTime(), iso).toBeGreaterThan(new Date(iso).getTime())
    }
  })

  it('never silences alerts for more than a day', () => {
    const now = new Date('2026-09-19T05:01:00Z')
    expect(nextMorning(now).getTime() - now.getTime()).toBeLessThanOrEqual(24 * 3600_000)
  })
})
