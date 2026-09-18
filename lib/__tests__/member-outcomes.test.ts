import { describe, expect, it } from 'vitest'
import {
  CANONICAL_OUTCOMES,
  CLOSINGS_SQL,
  RESULTS_SQL,
  applyMemberOutcomes,
  canonicalProfit,
  displayStatus,
  isCanonicalOutcome,
} from '@/lib/member-outcomes'

describe('canonicalProfit', () => {
  it('follows the contract table at the member odds and stake', () => {
    expect(canonicalProfit('won', 10, 2.4)).toBeCloseTo(14)
    expect(canonicalProfit('half_won', 10, 2.4)).toBeCloseTo(7)
    expect(canonicalProfit('push', 10, 2.4)).toBe(0)
    expect(canonicalProfit('void', 10, 2.4)).toBe(0)
    expect(canonicalProfit('half_lost', 10, 2.4)).toBe(-5)
    expect(canonicalProfit('lost', 10, 2.4)).toBe(-10)
  })
})

describe('displayStatus', () => {
  it('maps half outcomes onto the same display status as full ones', () => {
    expect(CANONICAL_OUTCOMES.map(displayStatus)).toEqual(['laimeta', 'laimeta', 'grazinta', 'grazinta', 'pralaimeta', 'pralaimeta'])
    expect(isCanonicalOutcome('half_won')).toBe(true)
    expect(isCanonicalOutcome('graded')).toBe(false)
  })
})

describe('SQL', () => {
  it('computes the same profits as the pure function and only writes changed rows', () => {
    expect(RESULTS_SQL).toContain("WHEN 'half_won' THEN ub.stake * (ub.odds - 1) / 2")
    expect(RESULTS_SQL).toContain("WHEN 'half_lost' THEN -ub.stake / 2")
    expect(RESULTS_SQL).toContain('IS DISTINCT FROM sr.outcome')
    expect(CLOSINGS_SQL).toContain('IS DISTINCT FROM scp.closing_fair_prob')
  })
})

describe('applyMemberOutcomes', () => {
  const client = (behaviour: (sql: string) => { rowCount: number } | Error) => ({
    calls: [] as Array<[string, unknown[]]>,
    async query(sql: string, params: unknown[]) {
      this.calls.push([sql, params])
      const outcome = behaviour(sql)
      if (outcome instanceof Error) throw outcome
      return outcome
    },
  })

  const dbError = (code: string) => Object.assign(new Error(`database error ${code}`), { code })

  it('reports updated rows for one member, results before closings', async () => {
    const q = client((sql) => ({ rowCount: sql === RESULTS_SQL ? 2 : 1 }))
    const sync = await applyMemberOutcomes(q as never, 'user-1')
    expect(sync).toEqual({ resultsAvailable: true, closingsAvailable: true, resultsUpdated: 2, closingsUpdated: 1 })
    expect(q.calls).toEqual([
      [RESULTS_SQL, ['user-1']],
      [CLOSINGS_SQL, ['user-1']],
    ])
  })

  it('treats missing tables as "not deployed yet", not as a failure', async () => {
    const q = client(() => dbError('42P01'))
    await expect(applyMemberOutcomes(q as never, null)).resolves.toEqual({
      resultsAvailable: false,
      closingsAvailable: false,
      resultsUpdated: 0,
      closingsUpdated: 0,
    })
  })

  it('rethrows real database errors, including a missing bet column', async () => {
    await expect(applyMemberOutcomes(client(() => dbError('42501')) as never, 'user-1')).rejects.toThrow('42501')
    await expect(applyMemberOutcomes(client(() => dbError('42703')) as never, 'user-1')).rejects.toThrow('42703')
  })
})
