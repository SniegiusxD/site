import { describe, expect, it } from 'vitest'
import { parseBookRequest } from '@/lib/book-requests'

describe('parseBookRequest', () => {
  it('normalises the name and keeps only known sports', () => {
    expect(parseBookRequest({ name: '  Opti   bet ', country: 'LV', sports: ['football', 'curling'], comment: ' daug krepšinio ' })).toEqual({
      ok: true,
      value: { name: 'Opti bet', country: 'LV', sports: ['football'], comment: 'daug krepšinio' },
    })
  })

  it('needs a name, and falls back to Lithuania for an unknown country', () => {
    expect(parseBookRequest({ name: 'x' }).ok).toBe(false)
    expect(parseBookRequest({ name: 'UniClub', country: 'US' })).toMatchObject({ ok: true, value: { country: 'LT', sports: [], comment: null } })
  })

  it('rejects an overlong name', () => {
    expect(parseBookRequest({ name: 'a'.repeat(61) }).ok).toBe(false)
  })
})
