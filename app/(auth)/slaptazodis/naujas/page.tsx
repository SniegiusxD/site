import type { Metadata } from 'next'
import { NewPasswordForm } from '@/components/auth/reset-password-form'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Naujas slaptažodis | ${brand.name}`,
  robots: { index: false },
}

/** Where the emailed link lands: `?token=…`, or `?error=INVALID_TOKEN` when it expired or was used. */
export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams
  return (
    <div>
      <h1 className="text-[2.75rem] sm:text-[3.25rem]">Naujas slaptažodis</h1>
      <p className="mt-3 text-haze">Įrašyk naują slaptažodį. Po to prisijungsi su juo.</p>
      <NewPasswordForm token={typeof token === 'string' && /^[\w-]{10,100}$/.test(token) ? token : null} linkError={Boolean(error)} />
    </div>
  )
}
