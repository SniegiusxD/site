import { describe, expect, it } from 'vitest'
import { parseContact } from '@/lib/feedback'

describe('parseContact', () => {
  it('takes an address to answer to and a message', () => {
    expect(parseContact({ email: ' Jonas@Gmail.com ', message: 'Negaliu prisijungti' })).toEqual({
      ok: true,
      value: { email: 'jonas@gmail.com', message: 'Negaliu prisijungti' },
    })
  })

  it('asks again for a missing address or a too short or too long message', () => {
    expect(parseContact({ email: 'nope', message: 'Negaliu prisijungti' }).ok).toBe(false)
    expect(parseContact({ email: 'jonas@gmail.com', message: 'hi' }).ok).toBe(false)
    expect(parseContact({ email: 'jonas@gmail.com', message: 'x'.repeat(2001) }).ok).toBe(false)
  })

  it('marks a filled hidden field as spam', () => {
    expect(parseContact({ email: 'bot@spam.io', message: 'Buy now buy now', website: 'http://spam' })).toMatchObject({ ok: false, spam: true })
  })
})
