import { EvidenceStrip } from '@/components/landing/evidence-strip'
import { Faq } from '@/components/landing/faq'
import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero'
import { ClosingLine } from '@/components/landing/closing-line'
import { HowItWorks } from '@/components/landing/how-it-works'
import { Journey } from '@/components/landing/journey'
import { LiveStrip } from '@/components/landing/live-strip'
import { OddsTicker } from '@/components/landing/odds-ticker'
import { Pricing } from '@/components/landing/pricing'
import { ProductTiles } from '@/components/landing/product-tiles'
import { Proof } from '@/components/landing/proof'
import { Rights } from '@/components/landing/rights'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { loadPublicStats } from '@/lib/public-stats'

// The live numbers read the database; rebuild the page at most every 5 minutes.
export const revalidate = 300

export default async function LandingPage() {
  const stats = await loadPublicStats()
  return (
    <>
      <SiteHeader />
      <main>
        <Hero stats={stats} />
        <EvidenceStrip />
        <OddsTicker />
        <LiveStrip stats={stats} />
        <HowItWorks />
        <ClosingLine />
        <Journey />
        <ProductTiles stats={stats} />
        <Proof />
        <Rights />
        <Pricing />
        <Faq />
        <FinalCta stats={stats} />
      </main>
      <SiteFooter />
    </>
  )
}
