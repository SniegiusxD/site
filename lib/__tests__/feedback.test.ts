import { describe, expect, it } from 'vitest'
import { parseFeedback } from '@/lib/feedback'

describe('parseFeedback', () => {
  it('accepts a note with a known kind and keeps our own page path', () => {
    expect(parseFeedback({ kind: 'bug', message: '  Neveikia filtras  ', page: '/signalai', contactOk: true })).toEqual({
      ok: true,
      value: { kind: 'bug', message: 'Neveikia filtras', page: '/signalai', contactOk: true },
    })
  })

  it('drops outside URLs as the page and defaults contact to no', () => {
    expect(parseFeedback({ kind: 'idea', message: 'Daugiau lygų', page: 'https://evil.example' })).toMatchObject({
      ok: true,
      value: { page: null, contactOk: false },
    })
  })

  it('needs a kind and a real message', () => {
    expect(parseFeedback({ kind: 'spam', message: 'hello there' }).ok).toBe(false)
    expect(parseFeedback({ kind: 'bug', message: 'hi' }).ok).toBe(false)
    expect(parseFeedback({ kind: 'bug', message: 'x'.repeat(2001) }).ok).toBe(false)
  })
})
