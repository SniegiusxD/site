import { describe, expect, it, vi } from 'vitest'
import { parseCloseEvidence, REASON_TEXT, TRUST_REASONS, trustLabel } from '@/lib/close-evidence'
import trusted from './fixtures/close-evidence-trusted.json'
import untrusted from './fixtures/close-evidence-untrusted.json'

vi.mock('@/lib/db', () => ({ pool: { query: vi.fn() } }))

describe('parseCloseEvidence', () => {
  it('reads the untrusted snapshot with its reasons and coverage', () => {
    expect(parseCloseEvidence(untrusted)).toEqual({
      generatedAt: '2026-09-24T18:40:00.000Z',
      coverage: 0.41,
      trusted: false,
      reasons: ['sample_too_small', 'coverage_below_threshold'],
    })
  })

  it('reads a trusted snapshot', () => {
    expect(parseCloseEvidence(trusted)?.trusted).toBe(true)
  })

  it('accepts pg shapes: a Date, a numeric string and jsonb as text', () => {
    const parsed = parseCloseEvidence({
      generated_at: new Date('2026-09-24T18:40:00Z'),
      close_coverage: '0.5',
      close_trust: JSON.stringify({ trusted: true, reasons: [] }),
    })
    expect(parsed).toEqual({ generatedAt: '2026-09-24T18:40:00.000Z', coverage: 0.5, trusted: true, reasons: [] })
  })

  it('trusts only a literal true', () => {
    for (const value of ['true', 1, 'yes', null, undefined]) {
      expect(parseCloseEvidence({ close_trust: { trusted: value } })?.trusted).toBe(false)
    }
  })

  it('never infers trust from a good-looking coverage', () => {
    expect(parseCloseEvidence({ close_coverage: 0.99, close_trust: { reasons: [] } })?.trusted).toBe(false)
  })

  it('drops unknown and repeated reason codes', () => {
    expect(parseCloseEvidence({ close_trust: { trusted: false, reasons: ['sample_too_small', 'bogus', 3, 'sample_too_small'] } })?.reasons).toEqual([
      'sample_too_small',
    ])
  })

  it('keeps coverage within 0–1 and treats garbage as unknown', () => {
    expect(parseCloseEvidence({ close_coverage: 1.4 })?.coverage).toBe(1)
    expect(parseCloseEvidence({ close_coverage: -0.2 })?.coverage).toBe(0)
    expect(parseCloseEvidence({ close_coverage: 'n/a' })?.coverage).toBeNull()
    expect(parseCloseEvidence({ close_coverage: null })?.coverage).toBeNull()
  })

  it('returns null for no row', () => {
    expect(parseCloseEvidence(undefined)).toBeNull()
    expect(parseCloseEvidence([])).toBeNull()
  })
})

describe('trustLabel', () => {
  it('says trusted only when the snapshot says so', () => {
    expect(trustLabel(parseCloseEvidence(trusted))).toEqual({
      trusted: true,
      title: 'CLV patikimas',
      reasons: [],
      coverage: 'Uždarymo kaina: 87 % signalų',
    })
  })

  it('explains every reason in plain Lithuanian, with the coverage share', () => {
    expect(trustLabel(parseCloseEvidence(untrusted))).toEqual({
      trusted: false,
      title: 'CLV dar nepatikimas',
      reasons: ['Per mažai signalų su uždarymo kaina.', 'Uždarymo kainą turim per mažai daliai signalų.'],
      coverage: 'Uždarymo kaina: 41 % signalų',
    })
  })

  it('is not trusted before the scanner has written anything', () => {
    expect(trustLabel(null)).toMatchObject({ trusted: false, reasons: ['Uždarymo kainų patikimumas dar neįvertintas.'], coverage: null })
  })

  it('still gives a reason when an untrusted snapshot lists none', () => {
    expect(trustLabel(parseCloseEvidence({ close_trust: { trusted: false, reasons: [] } })).reasons).toEqual(['Duomenų kokybė dar tikrinama.'])
  })

  it('has a sentence for every reason code', () => {
    for (const reason of TRUST_REASONS) expect(REASON_TEXT[reason]).toMatch(/\.$/)
  })
})

describe('loadCloseEvidence', () => {
  const dbError = (code: string) => Object.assign(new Error(code), { code })

  it('reads the single row', async () => {
    const { loadCloseEvidence, CLOSE_EVIDENCE_SQL } = await import('@/lib/close-evidence-store')
    const query = vi.fn(async () => ({ rows: [untrusted] }))
    await expect(loadCloseEvidence({ query } as never)).resolves.toMatchObject({ coverage: 0.41, trusted: false })
    expect(query).toHaveBeenCalledWith(CLOSE_EVIDENCE_SQL)
  })

  it('treats a missing table as no evidence, quietly', async () => {
    const { loadCloseEvidence } = await import('@/lib/close-evidence-store')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(loadCloseEvidence({ query: async () => Promise.reject(dbError('42P01')) } as never)).resolves.toBeNull()
    expect(log).not.toHaveBeenCalled()
    log.mockRestore()
  })

  it('logs other failures and still returns no evidence', async () => {
    const { loadCloseEvidence } = await import('@/lib/close-evidence-store')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(loadCloseEvidence({ query: async () => Promise.reject(dbError('57P01')) } as never)).resolves.toBeNull()
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  it('reads an empty table as no evidence', async () => {
    const { loadCloseEvidence } = await import('@/lib/close-evidence-store')
    await expect(loadCloseEvidence({ query: async () => ({ rows: [] }) } as never)).resolves.toBeNull()
  })
})
