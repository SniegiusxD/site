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
        // The help form needs a session, so the way out is the public contact
        // page, plus a direct contact when the owner sets SUPPORT_CONTACT.
        <p className="mt-3 text-haze">
          Slaptažodžio atkūrimas el. paštu dar neįjungtas.{' '}
          <Link href="/kontaktai" className="font-medium text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk">
            Parašyk mums
          </Link>{' '}
          ir nurodyk registracijos el. paštą — padėsim atgauti prieigą.
          {process.env.SUPPORT_CONTACT && ` Arba rašyk tiesiai: ${process.env.SUPPORT_CONTACT}.`}
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
