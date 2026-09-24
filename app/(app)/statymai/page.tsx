import type { Metadata } from 'next'
import { BetsView } from '@/components/app/bets-view'
import { brand } from '@/lib/brand'
import { trustLabel } from '@/lib/close-evidence'
import { loadCloseEvidence } from '@/lib/close-evidence-store'

export const metadata: Metadata = {
  title: `Statymai | ${brand.name}`,
}

// Read per request: the scanner rewrites the evidence snapshot on its own schedule.
export const dynamic = 'force-dynamic'

export default async function BetsPage() {
  return <BetsView closeTrust={trustLabel(await loadCloseEvidence())} />
}
