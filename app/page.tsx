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
import { trustLabel } from '@/lib/close-evidence'
import { loadCloseEvidence } from '@/lib/close-evidence-store'
import { summarize } from '@/lib/public-results'
import { heroRecordSignals } from '@/lib/hero-record'
import { loadPastSignals } from '@/lib/public-results-store'
import { loadPublicStats } from '@/lib/public-stats'

// The live numbers read the database; rebuild the page at most every 5 minutes.
export const revalidate = 300

export default async function LandingPage() {
  const [stats, closeEvidence, past] = await Promise.all([loadPublicStats(), loadCloseEvidence(), loadPastSignals()])
  return (
    <>
      <SiteHeader />
      <main>
        <Hero stats={stats} record={heroRecordSignals(past, new Date())} />
        <EvidenceStrip />
        <OddsTicker />
        <LiveStrip stats={stats} />
        <HowItWorks />
        <ClosingLine />
        <Journey />
        <ProductTiles stats={stats} />
        <Proof closeTrust={trustLabel(closeEvidence)} recent={past ? summarize(past) : null} />
        <Rights />
        <Pricing />
        <Faq />
        <FinalCta stats={stats} />
      </main>
      <SiteFooter />
    </>
  )
}
