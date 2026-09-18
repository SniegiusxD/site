import type { Metadata } from 'next'
import { SignalBoard } from '@/components/app/signal-board'
import { brand } from '@/lib/brand'
import { freeBoard } from '@/lib/free-tier'
import { loadLiveBoard } from '@/lib/live-signals'
import { loadRecentBets } from '@/lib/recent-bets'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'

export const metadata: Metadata = {
  title: `Signalai | ${brand.name}`,
}

export const dynamic = 'force-dynamic'

export default async function SignalsPage() {
  const user = await getSessionUser()
  if (!user) return null
  const [access, board, bets] = await Promise.all([getAccess(user.id), loadLiveBoard(), loadRecentBets(user.id)])
  // Free accounts never receive the locked signals, only their headline value.
  return <SignalBoard initial={access.hasAccess ? board : freeBoard(board)} initialBets={bets} access={access} />
}
