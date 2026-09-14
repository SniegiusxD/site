import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Prisijungti | ${brand.name}`,
}

export default function SignInPage() {
  return <AuthForm mode="sign-in" />
}
