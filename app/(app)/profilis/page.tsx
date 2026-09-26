import type { Metadata } from 'next'
import { ProfileView } from '@/components/app/profile-view'
import { brand } from '@/lib/brand'
import { loadPause } from '@/lib/self-pause-store'
import { getSessionUser } from '@/lib/session'

export const metadata: Metadata = {
  title: `Profilis | ${brand.name}`,
}

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getSessionUser()
  const paused = user ? await loadPause(user.id).catch(() => null) : null
  return <ProfileView pausedUntil={paused?.toISOString() ?? null} />
}
