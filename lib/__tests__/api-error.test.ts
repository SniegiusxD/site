import { describe, expect, it } from 'vitest'
import { errorAdvice, waitLabel } from '@/lib/api-error'

const error = (status: number, extra: { retryAfter?: number | null; serverMessage?: string | null } = {}) => ({
  status,
  retryAfter: extra.retryAfter ?? null,
  serverMessage: extra.serverMessage ?? null,
})

describe('waitLabel', () => {
  it('rounds up to seconds, minutes or hours', () => {
    expect(waitLabel(0)).toBe('1 s')
    expect(waitLabel(30)).toBe('30 s')
    expect(waitLabel(59.2)).toBe('60 s')
    expect(waitLabel(61)).toBe('2 min')
    expect(waitLabel(3600)).toBe('1 val.')
    expect(waitLabel(3601)).toBe('2 val.')
  })
})

describe('errorAdvice', () => {
  it('says the connection failed when there was no answer at all', () => {
    expect(errorAdvice(error(0), 'statymų')).toEqual({
      message: 'Nepavyko įkelti statymų: nėra ryšio su serveriu. Patikrink internetą ir bandyk dar kartą.',
      signIn: false,
      retry: true,
    })
  })

  it('sends a signed-out member to sign in instead of retrying', () => {
    expect(errorAdvice(error(401), 'statymų')).toMatchObject({ signIn: true, retry: false })
  })

  it('says how long to wait on a rate limit when the server said', () => {
    expect(errorAdvice(error(429, { retryAfter: 42 }), 'statymų').message).toBe('Per daug užklausų per trumpą laiką. Bandyk po 42 s.')
    expect(errorAdvice(error(429), 'statymų').message).toBe('Per daug užklausų per trumpą laiką. Palauk minutę ir bandyk dar kartą.')
  })

  it('offers a retry on a server error, without the server’s internals', () => {
    expect(errorAdvice(error(503, { serverMessage: 'pool exhausted' }), 'kainos istorijos')).toEqual({
      message: 'Nepavyko įkelti kainos istorijos. Serveris laikinai neatsako, bandyk dar kartą.',
      signIn: false,
      retry: true,
    })
  })

  it('passes on what the server told the member for other refusals', () => {
    expect(errorAdvice(error(400, { serverMessage: 'Neteisinga data.' }), 'statymų')).toMatchObject({ message: 'Neteisinga data.', retry: true })
  })

  it('does not offer a retry when access itself is refused', () => {
    expect(errorAdvice(error(403), 'statymų')).toMatchObject({ message: 'Nepavyko įkelti statymų.', retry: false })
    expect(errorAdvice(error(402, { serverMessage: 'Reikia prenumeratos.' }), 'signalų')).toMatchObject({ message: 'Reikia prenumeratos.', retry: false })
  })
})
