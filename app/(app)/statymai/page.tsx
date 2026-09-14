import type { Metadata } from 'next'
import { BetsView } from '@/components/app/bets-view'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Statymai | ${brand.name}`,
}

export default function BetsPage() {
  return <BetsView />
}
