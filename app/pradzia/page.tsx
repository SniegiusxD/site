import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/app/onboarding-flow'
import { loadAccount } from '@/lib/account-store'
import { brand } from '@/lib/brand'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = {
  title: `Pradžia | ${brand.name}`,
}

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const user = await getSessionUser()
  if (!user) redirect('/prisijungti')
  const account = await loadAccount(user.id)
  return <OnboardingFlow initial={account.preferences} />
}
