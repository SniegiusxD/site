import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Nemokama paskyra | ${brand.name}`,
}

export default function RegistrationPage() {
  return <AuthForm mode="sign-up" />
}
