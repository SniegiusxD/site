import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { brand } from '@/lib/brand'
import { GUIDES, guideBySlug } from '@/lib/guides'

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = guideBySlug((await params).slug)
  if (!guide) return {}
  return {
    title: `${guide.title} | ${brand.name}`,
    description: guide.description,
    alternates: { canonical: `/gidai/${guide.slug}` },
    openGraph: { type: 'article', title: guide.title, description: guide.description, modifiedTime: guide.updatedIso },
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug)
  if (!guide) notFound()
  const others = GUIDES.filter((entry) => entry.slug !== guide.slug)
  // Structured data so search engines show it as an article.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updatedIso,
    inLanguage: 'lt',
    publisher: { '@type': 'Organization', name: brand.name },
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[44rem] px-5 pt-32 pb-24 sm:px-8 lg:pt-40">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Link href="/gidai" className="text-[0.95rem] text-haze hover:text-chalk">
          ← Gidai
        </Link>
        <h1 className="mt-4 text-[2.6rem] leading-[1.05] sm:text-[3.4rem]">{guide.title}</h1>
        <p className="mt-4 text-haze">
          {guide.minutes} min. skaitymo, atnaujinta {guide.updated}
        </p>
        <article className="mt-10 space-y-10 text-[1.05rem] leading-relaxed text-haze [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[1.8rem] [&_h2]:leading-tight [&_h2]:text-chalk [&_li]:mt-2 [&_p+p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          {guide.body}
        </article>

        <aside className="mt-16 rounded-2xl bg-stand p-6 hairline">
          <p className="font-medium text-chalk">Pabandyk su tikrais signalais</p>
          <p className="mt-1.5 text-haze">
            Nemokama paskyra rodo tikrus signalus iki +2 % vertės. Tai nėra rekomendacija statyti — tai matematinis būdas rasti
            statymus, kurių koeficientas gali būti didesnis, nei rodo tikimybė.
          </p>
          <Link
            href="/registracija"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-floodlight px-5 font-semibold text-night transition-transform active:scale-[0.97]"
          >
            Sukurti nemokamą paskyrą
          </Link>
        </aside>

        <nav aria-label="Kiti gidai" className="mt-12">
          <p className="font-display text-[1.4rem] text-chalk">Kiti gidai</p>
          <ul className="mt-3 grid gap-2">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/gidai/${entry.slug}`} className="text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk">
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <SiteFooter />
    </>
  )
}
