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

  it('refuses addresses that would inject into the reply mailto: link', () => {
    expect(parseContact({ email: 'a@b.lt?bcc=x@y.lt', message: 'Negaliu prisijungti' }).ok).toBe(false)
    expect(parseContact({ email: 'a&b@c.lt', message: 'Negaliu prisijungti' }).ok).toBe(false)
    expect(parseContact({ email: 'vardas.pavarde+statyk@mail.co.uk', message: 'Negaliu prisijungti' }).ok).toBe(true)
  })

  it('marks a filled hidden field as spam', () => {
    expect(parseContact({ email: 'bot@spam.io', message: 'Buy now buy now', website: 'http://spam' })).toMatchObject({ ok: false, spam: true })
  })
})
