import Link from 'next/link'
import { EVIDENCE, beatShare, evidencePeriod } from '@/lib/evidence'
import { formatEdge, formatInteger, formatPercent } from '@/lib/format-lt'

/**
 * The evidence, directly under the hero. Counted by fixture: several lines of
 * one match are one opinion, and a count of signals would make the sample look
 * three times larger than it is. Return is shown with its interval rather than
 * as a headline, because at this many fixtures it cannot yet be told from zero
 * — the closing-price figure is the one that can.
 */
export function EvidenceStrip() {
  const share = beatShare()
  const items = [
    { value: formatInteger(EVIDENCE.fixtures), label: `rungtynės su atsiskaičiusiu signalu, ${evidencePeriod()}` },
    { value: share === null ? '—' : formatPercent(share, 1), label: `pagavo geresnę kainą nei uždarymas (${formatInteger(EVIDENCE.fixturesWithClosing)} rungtynių)` },
    { value: EVIDENCE.clvMean === null ? '—' : formatEdge(EVIDENCE.clvMean), label: 'vidutinis skirtumas nuo uždarymo kainos' },
    {
      value: formatEdge(EVIDENCE.roi),
      label: `grąža (nuo ${formatEdge(EVIDENCE.roiLow)} iki ${formatEdge(EVIDENCE.roiHigh)}) — dar per anksti išvadai`,
    },
  ]

  return (
    <section aria-label="Mūsų duomenys" className="border-y border-rail bg-night-alt px-5 py-6 sm:px-8">
      <div className="mx-auto flex max-w-[80rem] flex-wrap items-center gap-x-10 gap-y-5">
        <dl className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          {items.map((item) => (
            // Reversed so the number reads first while the list stays a real
            // definition list: the label was otherwise announced twice.
            <div key={item.label} className="flex flex-col-reverse">
              <dt className="mt-1.5 text-[0.8125rem] text-haze">{item.label}</dt>
              <dd className="font-display text-[1.7rem] leading-none font-extrabold tracking-[-0.03em] tnum">{item.value}</dd>
            </div>
          ))}
        </dl>
        <Link
          href="/metodika"
          className="shrink-0 border-b border-rail py-2 text-[0.9375rem] font-medium text-chalk transition-colors hover:border-chalk"
        >
          Kaip tai išmatuota
        </Link>
      </div>
    </section>
  )
}
