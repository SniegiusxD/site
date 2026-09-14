import { Faq } from '@/components/landing/faq'
import { Hero } from '@/components/landing/hero'
import { Proof } from '@/components/landing/proof'
import { Rights } from '@/components/landing/rights'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { ValueExplainer } from '@/components/landing/value-explainer'

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ValueExplainer />
        <Proof />
        <Rights />
        <Faq />
      </main>
      <SiteFooter />
    </>
  )
}
