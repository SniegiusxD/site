import { describe, expect, it, vi } from 'vitest'

import { judgeBacklog, loadSettlementBacklog, type SettlementBacklog as Backlog } from '@/lib/settlement-backlog'

const { query } = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('@/lib/db', () => ({ pool: { query } }))

function backlog(over: Partial<Omit<Backlog, 'waiting'>> & { waiting?: Partial<Backlog['waiting']> }): Backlog {
  return {
    due: 500,
    graded: 480,
    withClose: 400,
    sources7d: [],
    ...over,
    waiting: { underDay: 20, days1to7: 0, over7: 0, ...over.waiting },
  }
}

describe('judgeBacklog', () => {
  it('is calm when only recent matches wait', () => {
    expect(judgeBacklog(backlog({})).tone).toBe('ok')
  })

  it('says there is nothing to grade on an empty month', () => {
    const verdict = judgeBacklog(backlog({ due: 0, graded: 0, waiting: { underDay: 0 } }))
    expect(verdict.tone).toBe('ok')
    expect(verdict.note).toMatch(/nėra rungtynių/)
  })

  it('warns about anything past the Flashscore window, even one row', () => {
    const verdict = judgeBacklog(backlog({ waiting: { over7: 1 } }))
    expect(verdict.tone).toBe('warn')
    expect(verdict.note).toMatch(/Flashscore/)
  })

  it('tolerates a small 1–7 day tail but warns when it grows', () => {
    expect(judgeBacklog(backlog({ waiting: { days1to7: 15 } })).tone).toBe('ok')
    // 10 % of 480 graded = 48: above both floors.
    expect(judgeBacklog(backlog({ waiting: { days1to7: 49 } })).tone).toBe('warn')
  })
})

describe('loadSettlementBacklog', () => {
  it('turns the counts Postgres returns as strings into numbers', async () => {
    query.mockResolvedValueOnce({
      rows: [{ due: '12', graded: '9', with_close: '8', under_day: '2', days_1_7: '1', over_7: '0' }],
    })
    query.mockResolvedValueOnce({ rows: [{ source: 'flashscore', count: '7' }] })
    await expect(loadSettlementBacklog()).resolves.toEqual({
      due: 12,
      graded: 9,
      withClose: 8,
      waiting: { underDay: 2, days1to7: 1, over7: 0 },
      sources7d: [{ source: 'flashscore', count: 7 }],
    })
  })

  it('is null, quietly, before the VM has created its tables', async () => {
    const error = Object.assign(new Error('relation does not exist'), { code: '42P01' })
    query.mockRejectedValueOnce(error).mockRejectedValueOnce(error)
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(loadSettlementBacklog()).resolves.toBeNull()
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })
})
