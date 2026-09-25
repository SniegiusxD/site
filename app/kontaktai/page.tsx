import type { Metadata } from 'next'
import { ContactForm } from '@/components/landing/contact-form'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { brand } from '@/lib/brand'

export const metadata: Metadata = {
  title: `Kontaktai | ${brand.name}`,
  description: 'Parašyk mums: klausimas, problema ar negali prisijungti. Atsakome el. paštu.',
  alternates: { canonical: '/kontaktai' },
}

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[36rem] px-5 pt-32 pb-24 sm:px-8 lg:pt-40">
        <h1 className="text-[3rem] sm:text-[4rem]">Kontaktai</h1>
        <p className="mt-4 text-[1.1rem] text-haze">
          Klausimas, problema ar negali prisijungti? Parašyk — atsakysim el. paštu. Jei turi paskyrą ir esi prisijungęs, tą patį
          gali padaryti pagalbos puslapyje.
        </p>
        <ContactForm />
      </main>
      <SiteFooter />
    </>
  )
}
