import type { Metadata } from 'next'
import { SignalBoard } from '@/components/app/signal-board'
import { brand } from '@/lib/brand'
import { loadLiveBoard } from '@/lib/live-signals'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'

export const metadata: Metadata = {
  title: `Signalai | ${brand.name}`,
}

export const dynamic = 'force-dynamic'

export default async function SignalsPage() {
  // The layout shows the paywall without access; never load signals for it either.
  const user = await getSessionUser()
  if (!user || !(await getAccess(user.id)).hasAccess) return null
  const board = await loadLiveBoard()
  return <SignalBoard initial={board} />
}
