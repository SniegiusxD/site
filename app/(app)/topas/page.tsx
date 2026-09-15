import type { Metadata } from 'next'
import { TopView } from '@/components/app/top-view'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Topas | ${brand.name}`,
}

export default function TopPage() {
  return <TopView />
}
