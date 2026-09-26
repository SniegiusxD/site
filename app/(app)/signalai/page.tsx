import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { PausedBoard } from '@/components/app/paused-board'
import { SignalBoard } from '@/components/app/signal-board'
import { brand } from '@/lib/brand'
import { DENSITY_COOKIE, densityFromCookie } from '@/lib/board-density'
import { FIRST_STEPS_COOKIE } from '@/lib/first-steps'
import { freeBoard } from '@/lib/free-tier'
import { loadLiveBoard } from '@/lib/live-signals'
import { loadRecentBets } from '@/lib/recent-bets'
import { loadPause } from '@/lib/self-pause-store'
import { getSessionUser } from '@/lib/session'
import { getAccess } from '@/lib/subscription-store'

export const metadata: Metadata = {
  title: `Signalai | ${brand.name}`,
}

export const dynamic = 'force-dynamic'

export default async function SignalsPage({ searchParams }: { searchParams: Promise<{ atrakinta?: string; signal?: string; book?: string }> }) {
  const user = await getSessionUser()
  if (!user) return null
  // A member's own break: no signals are loaded or sent to the browser at all.
  const paused = await loadPause(user.id)
  if (paused) return <PausedBoard until={paused.toISOString()} />
  const [access, board, bets, jar] = await Promise.all([getAccess(user.id), loadLiveBoard(), loadRecentBets(user.id), cookies()])
  const { atrakinta, signal, book } = await searchParams
  // Free accounts never receive the locked signals, only their headline value.
  return (
    <SignalBoard
      initial={access.hasAccess ? board : freeBoard(board)}
      initialBets={bets}
      access={access}
      firstStepsDismissed={jar.get(FIRST_STEPS_COOKIE)?.value === '1'}
      justUnlocked={atrakinta === '1' && access.hasAccess}
      link={signal ? { signal, book } : undefined}
      initialDensity={densityFromCookie(jar.get(DENSITY_COOKIE)?.value)}
    />
  )
}
