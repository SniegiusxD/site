import type { Metadata } from 'next'
import { UnlockView } from '@/components/app/unlock-view'
import { billingEnabled } from '@/lib/billing/stripe'
import { brand } from '@/lib/brand'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'

export const metadata: Metadata = {
  title: `Atrakinti | ${brand.name}`,
}

export const dynamic = 'force-dynamic'

export default async function UnlockPage() {
  const user = await getSessionUser()
  if (!user) return null
  return <UnlockView access={await getAccess(user.id)} billing={billingEnabled()} />
}
