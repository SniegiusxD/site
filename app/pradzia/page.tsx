import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/app/onboarding-flow'
import { loadAccount } from '@/lib/account-store'
import { brand } from '@/lib/brand'
import { getSessionUser } from '@/lib/session'
import { loadSignalCounts } from '@/lib/signal-counts'

export const metadata: Metadata = {
  title: `Pradžia | ${brand.name}`,
}

export const dynamic = 'force-dynamic'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ is_naujo?: string }> }) {
  const user = await getSessionUser()
  if (!user) redirect('/prisijungti')
  const [account, counts, params] = await Promise.all([loadAccount(user.id), loadSignalCounts(), searchParams])
  // Asked once. Everything here can be changed in the profile; walking the
  // whole flow again is only on purpose, from the profile's link.
  if (account.onboarded && params.is_naujo === undefined) redirect('/signalai')
  return <OnboardingFlow initial={account.preferences} counts={counts} />
}
