import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { brand } from '@/lib/brand'
import { formatEdge, formatOdds } from '@/lib/format-lt'
import { kickoffLabel } from '@/lib/live-view'
import { clvOf, outcomeText, type PastSignal, selectionText } from '@/lib/public-results'
import { loadPastSignal } from '@/lib/public-results-store'
import { sportName } from '@/lib/sports-lt'

export const revalidate = 600

const eventOf = (signal: PastSignal) =>
  signal.home && signal.away ? `${signal.home} – ${signal.away}` : signal.home || signal.away || 'Rungtynės'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const signal = await loadPastSignal((await params).id)
  if (!signal) return { robots: { index: false } }
  const clv = clvOf(signal)
  return {
    title: `${eventOf(signal)}: ${selectionText(signal)} | ${brand.name}`,
    description: `${signal.book} ${formatOdds(signal.odds)}, vertė ${formatEdge(signal.edge)}${
      clv === null ? '' : `, CLV ${formatEdge(clv)}`
    }. Vienas iš visų mūsų paskelbtų signalų, palygintas su uždarymo kaina.`,
    alternates: { canonical: `/rezultatai/${signal.id}` },
    // Made for sharing, not search: hundreds of near-identical pages would
    // dilute the site. /rezultatai itself is indexed.
    robots: { index: false, follow: true },
  }
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-2xl bg-stand p-5 hairline">
      <dt className="text-[0.9rem] text-haze">{label}</dt>
      <dd className={`mt-1 font-display text-[2rem] leading-none tabular-nums ${tone === 'up' ? 'text-pitch' : tone === 'down' ? 'text-brick' : 'text-chalk'}`}>
        {value}
      </dd>
    </div>
  )
}

/**
 * One finished signal on its own, for sharing: what we published, what the
 * market closed at and how it ended. Only signals whose match has started
 * exist here, so nothing on this page can still be bet.
 */
export default async function PastSignalPage({ params }: { params: Promise<{ id: string }> }) {
  const signal = await loadPastSignal((await params).id)
  if (!signal) notFound()
  const clv = clvOf(signal)
  const fairOdds = signal.odds / (1 + signal.edge)
  const outcome = outcomeText(signal.outcome)
  const won = signal.outcome === 'won' || signal.outcome === 'half_won'
  const lost = signal.outcome === 'lost' || signal.outcome === 'half_lost'

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[44rem] px-5 pt-32 pb-24 sm:px-8 lg:pt-40">
        <Link href="/rezultatai" className="text-[0.95rem] text-haze hover:text-chalk">
          ← Visi rezultatai
        </Link>
        <p className="mt-6 text-haze">
          {sportName(signal.sport)} · {kickoffLabel(signal.startsAt)}
        </p>
        <h1 className="mt-2 text-[2.4rem] leading-[1.05] sm:text-[3.2rem]">{eventOf(signal)}</h1>
        <p className="mt-3 text-[1.2rem] text-chalk">{selectionText(signal)}</p>

        <dl className="mt-10 grid grid-cols-2 gap-3">
          <Fact label={`${signal.book} koeficientas`} value={formatOdds(signal.odds)} />
          <Fact label="Tikroji kaina paskelbus" value={formatOdds(fairOdds)} />
          <Fact label="Uždarymo kaina" value={signal.closingFairProb ? formatOdds(1 / signal.closingFairProb) : 'nėra'} />
          <Fact label="CLV" value={clv === null ? 'nėra' : formatEdge(clv)} tone={clv === null ? undefined : clv > 0 ? 'up' : 'down'} />
        </dl>
        <p className="mt-3 rounded-2xl bg-stand p-5 text-[1.05rem] hairline">
          <span className="text-haze">Rezultatas: </span>
          <span className={won ? 'text-pitch' : lost ? 'text-brick' : 'text-chalk'}>{outcome ?? 'dar laukiama įvertinimo'}</span>
        </p>

        <div className="mt-10 space-y-3 text-haze">
          <p>
            Paskelbus signalą {signal.book} mokėjo {formatOdds(signal.odds)}, o tikroji kaina be maržos buvo {formatOdds(fairOdds)} —
            vertė {formatEdge(signal.edge)}.{' '}
            {clv === null
              ? 'Uždarymo kainos neužfiksavome, todėl CLV šiam signalui nėra.'
              : clv > 0
                ? `Prieš rungtynes rinka užsidarė ${formatOdds(1 / signal.closingFairProb!)}, tad kaina buvo geresnė už uždarymą.`
                : `Prieš rungtynes rinka užsidarė ${formatOdds(1 / signal.closingFairProb!)}, tad šįkart kaina uždarymo neaplenkė.`}
          </p>
          <p>
            Vienas signalas nieko neįrodo — svarbu, kaip sekasi visiems.{' '}
            <Link href="/rezultatai" className="text-chalk underline decoration-rail-strong underline-offset-4 hover:decoration-chalk">
              Visi signalai ir jų CLV
            </Link>
          </p>
        </div>

        <aside className="mt-12 rounded-2xl bg-stand p-6 hairline">
          <p className="font-medium text-chalk">Tokie signalai — kol rungtynės dar nevyksta</p>
          <p className="mt-1.5 text-haze">Nemokama paskyra rodo tikrus signalus iki +2 % vertės. Tai nėra rekomendacija statyti.</p>
          <Link
            href="/registracija"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-floodlight px-5 font-semibold text-night transition-transform active:scale-[0.97]"
          >
            Sukurti nemokamą paskyrą
          </Link>
        </aside>
      </main>
      <SiteFooter />
    </>
  )
}
