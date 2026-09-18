import type { Metadata } from 'next'
import { Calculator } from '@/components/landing/calculator'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { brand } from '@/lib/brand'
import { loadSignalCounts } from '@/lib/signal-counts'

export const metadata: Metadata = {
  title: `Skaičiuoklė | ${brand.name}`,
  description: 'Trys klausimai ir 100 scenarijų iš mūsų tikrų užbaigtų signalų. Parodom ir blogus scenarijus.',
}

// Signal counts change slowly; refresh the page at most every 15 minutes.
export const revalidate = 900

export default async function CalculatorPage() {
  const counts = await loadSignalCounts()
  return (
    <>
      <SiteHeader />
      <main className="pt-16">
        <Calculator counts={counts} />
      </main>
      <SiteFooter />
    </>
  )
}
