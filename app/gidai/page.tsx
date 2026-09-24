import type { Metadata } from 'next'
import Link from 'next/link'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { brand } from '@/lib/brand'
import { GUIDES } from '@/lib/guides'

export const metadata: Metadata = {
  title: `Gidai: vertės statymai, CLV, Kelly | ${brand.name}`,
  description: 'Paprastai apie vertės statymus, CLV, Kelly kriterijų ir kontorų limitus. Be pažadų — kaip tai veikia ir ko tai negarantuoja.',
  alternates: { canonical: '/gidai' },
}

export default function GuidesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[52rem] px-5 pt-32 pb-24 sm:px-8 lg:pt-40">
        <h1 className="text-[3rem] sm:text-[4rem]">Gidai</h1>
        <p className="mt-4 max-w-[36rem] text-[1.1rem] text-haze">
          Kaip veikia vertės statymai, kodėl svarbus CLV ir kiek statyti. Paprastai ir be pažadų.
        </p>
        <ul className="mt-12 grid gap-4">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/gidai/${guide.slug}`}
                className="block rounded-2xl bg-stand p-6 hairline transition-colors hover:bg-stand-hover"
              >
                <h2 className="text-[1.6rem] leading-tight">{guide.title}</h2>
                <p className="mt-2 text-haze">{guide.description}</p>
                <p className="mt-3 text-[0.9rem] text-haze-dim">{guide.minutes} min. skaitymo</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  )
}
