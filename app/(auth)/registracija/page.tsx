import type { Metadata } from 'next'
import { AuthForm } from '@/components/auth/auth-form'
import { brand } from '@/lib/brand'
import { formatEdge } from '@/lib/format-lt'
import { FREE_MAX_EDGE } from '@/lib/free-tier'
import { MIN_AGE } from '@/lib/legal-entity'

export const metadata: Metadata = {
  title: `Nemokama paskyra | ${brand.name}`,
  description: `Nemokama paskyra be kortelės: signalai iki ${formatEdge(FREE_MAX_EDGE)} vertės, statymų ir bankrollo sekimas. Tik nuo ${MIN_AGE} metų.`,
  alternates: { canonical: '/registracija' },
}

export default function RegistrationPage() {
  return <AuthForm mode="sign-up" />
}
