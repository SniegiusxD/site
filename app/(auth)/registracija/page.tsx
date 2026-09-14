import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Registracija: 7 dienos nemokamai | ${brand.name}`,
}

export default function RegistrationPage() {
  return <AuthForm mode="sign-up" />
}
