import { Faq } from '@/components/landing/faq'
import { FinalCta } from '@/components/landing/final-cta'
import { Hero } from '@/components/landing/hero'
import { MathStory } from '@/components/landing/math-story'
import { Pricing } from '@/components/landing/pricing'
import { ProductTiles } from '@/components/landing/product-tiles'
import { Proof } from '@/components/landing/proof'
import { Rights } from '@/components/landing/rights'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <MathStory />
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
