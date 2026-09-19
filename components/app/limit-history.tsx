'use client'

import { useEffect, useState } from 'react'
import { BookMark } from '@/components/landing/book-mark'
import { type LimitEvent, limitDirection } from '@/lib/book-limits'
import { formatEuro } from '@/lib/format-lt'
import { kickoffLabel } from '@/lib/live-view'

const SENTENCE: Record<ReturnType<typeof limitDirection>, (event: LimitEvent) => string> = {
  cut: (event) => `nusileido iki ${formatEuro(event.to ?? 0)} (buvo ${formatEuro(event.from ?? 0)})`,
  raised: (event) => `pakilo iki ${formatEuro(event.to ?? 0)} (buvo ${formatEuro(event.from ?? 0)})`,
  set: (event) => `limitas ${formatEuro(event.to ?? 0)}`,
  removed: () => 'limitas nuimtas',
}

/**
 * How each bookmaker's ceiling moved over time, and how often one of them cut
 * a stake at placement. Members lose this history the moment they overwrite a
 * number in the settings, and it is the only record they have of being limited.
 */
export function LimitHistory() {
  const [data, setData] = useState<{ events: LimitEvent[]; cuts: Record<string, number> } | null>(null)

  useEffect(() => {
    let live = true
    fetch('/api/preferences/limits', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => live && body && setData(body))
      .catch(() => {
        // The settings above still work without the history.
      })
    return () => {
      live = false
    }
  }, [])

  const cuts = Object.entries(data?.cuts ?? {}).filter(([, count]) => count > 0)
  if (!data || (data.events.length === 0 && cuts.length === 0)) return null

  return (
    <div className="mt-6 border-t border-rail pt-5">
      <p className="font-medium">Limitų istorija</p>
      {cuts.length > 0 && (
        <p className="mt-1 text-[0.95rem] text-haze">
          Kontora apkarpė sumą: {cuts.map(([book, count]) => `${book} ${count}`).join(', ')}.
        </p>
      )}
      <ul className="mt-3 grid gap-2 text-[0.95rem]">
        {data.events.slice(0, 8).map((event) => (
          <li key={event.id} className="flex items-center gap-2.5">
            <BookMark book={event.bookmaker} size="sm" />
            <span className="text-haze">
              <span className="text-chalk">{event.bookmaker}</span> {SENTENCE[limitDirection(event)](event)} ·{' '}
              {kickoffLabel(event.at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
