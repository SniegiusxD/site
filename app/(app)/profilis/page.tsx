import type { Metadata } from 'next'
import { ProfileView } from '@/components/app/profile-view'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Profilis | ${brand.name}`,
}

export default function ProfilePage() {
  return <ProfileView />
}
