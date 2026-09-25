/**
 * Transactional email through Resend's HTTP API (no SDK). Off until the owner
 * sets RESEND_API_KEY and EMAIL_FROM (a sender on a domain verified in
 * Resend, e.g. "Statyk <pagalba@statyk.me>"); pages that need email check
 * `emailConfigured()` and offer another way meanwhile.
 */

import { brand } from '@/lib/brand'

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)

/** Test and placeholder addresses: never sent, so CI and June accounts cause no bounces. */
export const isUndeliverable = (to: string) => /@(example\.com|signalai\.local)$/i.test(to) || /^e2e-check-/i.test(to)

export async function sendEmail(message: { to: string; subject: string; text: string }): Promise<void> {
  if (isUndeliverable(message.to)) {
    console.info('[email] skipped test address')
    return
  }
  if (!emailConfigured()) throw new Error('email is not configured')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [message.to], subject: message.subject, text: message.text }),
  })
  if (!response.ok) throw new Error(`email provider answered ${response.status}`)
}

/** The reset email, in the site's voice: what happened, the link, how long it works. */
export function resetPasswordEmail(url: string): { subject: string; text: string } {
  return {
    subject: `Slaptažodžio keitimas – ${brand.name}`,
    text: [
      'Sveiki,',
      '',
      `Kažkas (tikėtina, jūs) paprašė pakeisti ${brand.name} paskyros slaptažodį. Naują nustatysite čia:`,
      '',
      url,
      '',
      'Nuoroda galioja 1 valandą ir veikia vieną kartą. Jei to neprašėte, šį laišką galite ignoruoti – slaptažodis nepasikeis.',
      '',
      brand.name,
    ].join('\n'),
  }
}
