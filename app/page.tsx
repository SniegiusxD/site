import { Faq } from '@/components/landing/faq'
import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero'
import { Journey } from '@/components/landing/journey'
import { LiveStrip } from '@/components/landing/live-strip'
import { MathStory } from '@/components/landing/math-story'
import { Pricing } from '@/components/landing/pricing'
import { ProductTiles } from '@/components/landing/product-tiles'
import { Proof } from '@/components/landing/proof'
import { Rights } from '@/components/landing/rights'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { loadPublicStats } from '@/lib/public-stats'

// The live strip reads the database; rebuild the page at most every 5 minutes.
export const revalidate = 300

export default async function LandingPage() {
  const stats = await loadPublicStats()
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <LiveStrip stats={stats} />
        <MathStory />
        <Journey />
        <ProductTiles />
        <Proof />
        <Rights />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  )
}
