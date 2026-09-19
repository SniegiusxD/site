import Link from 'next/link'
import { formatEdge, formatInteger, formatOdds } from '@/lib/format-lt'
import { TRACK_RECORD, recordPeriodLabel } from '@/lib/pace'

/**
 * The evidence, directly under the hero. The audit's point was that a visitor
 * reaches our strongest proof far too late; every figure here carries its own
 * sample and period so it cannot be read as a promise.
 */
export function EvidenceStrip() {
  const items = [
    { value: formatInteger(TRACK_RECORD.bets), label: `atsiskaitę signalai, ${recordPeriodLabel()}` },
    { value: formatEdge(TRACK_RECORD.roi), label: 'grąža per tą laikotarpį' },
    { value: formatOdds(TRACK_RECORD.averageOdds), label: 'vidutinis koeficientas' },
    { value: '3 693', label: 'statymai su užfiksuota uždarymo kaina' },
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
          href="/#duomenys"
          className="shrink-0 border-b border-rail py-2 text-[0.9375rem] font-medium text-chalk transition-colors hover:border-chalk"
        >
          Kaip tai išmatuota
        </Link>
      </div>
    </section>
  )
}
