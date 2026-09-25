import type { Metadata } from 'next'
import Link from 'next/link'
import { RequestResetForm } from '@/components/auth/reset-password-form'
import { brand } from '@/lib/brand'
import { emailConfigured } from '@/lib/email'

export const metadata: Metadata = {
  title: `Pamiršai slaptažodį? | ${brand.name}`,
  robots: { index: false },
}

// Whether email is configured is read at request time, not baked in at build.
export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-[2.75rem] sm:text-[3.25rem]">Pamiršai slaptažodį?</h1>
      {emailConfigured() ? (
        <>
          <p className="mt-3 text-haze">Įrašyk el. paštą, kuriuo registravaisi. Atsiųsim nuorodą naujam slaptažodžiui.</p>
          <RequestResetForm />
        </>
      ) : (
        // Until the owner connects an email sender there is no link to send.
        // The help form needs a session, so the way out is a contact the owner
        // sets (SUPPORT_CONTACT, e.g. a Telegram handle), or an honest "not yet".
        <p className="mt-3 text-haze">
          {process.env.SUPPORT_CONTACT
            ? `Slaptažodžio atkūrimas el. paštu dar neįjungtas. Parašyk ${process.env.SUPPORT_CONTACT} ir nurodyk registracijos el. paštą — padėsim atgauti prieigą.`
            : 'Slaptažodžio atkūrimas el. paštu dar neįjungtas. Jis bus čia netrukus.'}
        </p>
      )}
      <p className="mt-8 text-haze">
        Prisiminei?{' '}
        <Link href="/prisijungti" className="font-medium text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk">
          Prisijunk
        </Link>
      </p>
    </div>
  )
}
