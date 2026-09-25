import { afterEach, describe, expect, it, vi } from 'vitest'
import { isUndeliverable, resetPasswordEmail, sendEmail } from '@/lib/email'

describe('email', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('never mails test and placeholder addresses', () => {
    expect(isUndeliverable('e2e-check-1-member@example.com')).toBe(true)
    expect(isUndeliverable('june-user@signalai.local')).toBe(true)
    expect(isUndeliverable('jonas@gmail.com')).toBe(false)
  })

  it('refuses to pretend it sent when no provider is configured', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    await expect(sendEmail({ to: 'jonas@gmail.com', subject: 's', text: 't' })).rejects.toThrow('not configured')
  })

  it('posts to the provider and surfaces a refusal', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test')
    vi.stubEnv('EMAIL_FROM', 'Statyk <pagalba@statyk.me>')
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 422 })
    vi.stubGlobal('fetch', fetch)
    await expect(sendEmail({ to: 'jonas@gmail.com', subject: 's', text: 't' })).rejects.toThrow('422')
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ to: ['jonas@gmail.com'], from: 'Statyk <pagalba@statyk.me>' })
  })

  it('the reset mail carries the link and says how long it works', () => {
    const mail = resetPasswordEmail('https://statyk.me/api/auth/reset-password/abc?callbackURL=%2Fslaptazodis%2Fnaujas')
    expect(mail.text).toContain('https://statyk.me/api/auth/reset-password/abc')
    expect(mail.text).toContain('1 valandą')
  })
})

describe('resetLinkFor', () => {
  it('goes through the auth callback on our own origin and lands on the new-password page', async () => {
    const { resetLinkFor } = await import('@/lib/reset-link-capture')
    expect(resetLinkFor('tok123', 'https://statyk.me/api/auth/request-password-reset')).toBe(
      'https://statyk.me/api/auth/reset-password/tok123?callbackURL=%2Fslaptazodis%2Fnaujas',
    )
  })
})
