import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Prisijungti | ${brand.name}`,
  description: 'Prisijunk ir žiūrėk šiandienos signalus, savo statymus ir rezultatus.',
  alternates: { canonical: '/prisijungti' },
}

export default function SignInPage() {
  return <AuthForm mode="sign-in" />
}
