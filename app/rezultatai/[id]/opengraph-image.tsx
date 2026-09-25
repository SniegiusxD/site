import { ImageResponse } from 'next/og'
import { formatEdge, formatOdds } from '@/lib/format-lt'
import { displayFont, OG, OG_SIZE, OgFrame, ogFonts } from '@/lib/og'
import { clvOf, outcomeText, selectionText } from '@/lib/public-results'
import { loadPastSignal } from '@/lib/public-results-store'

export const alt = 'Statyk signalas: kaina, uždarymas ir rezultatas'
export const size = OG_SIZE
export const contentType = 'image/png'
export const revalidate = 600

/** A finished signal's card: the price we published, CLV and the result. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const signal = await loadPastSignal((await params).id)
  const event = signal ? (signal.home && signal.away ? `${signal.home} – ${signal.away}` : signal.home || 'Rungtynės') : 'Signalas'
  const pick = signal ? selectionText(signal) : ''
  const clv = signal ? clvOf(signal) : null
  const facts = signal
    ? [
        { value: formatOdds(signal.odds), label: `${signal.book} koeficientas` },
        { value: clv === null ? '—' : formatEdge(clv), label: 'CLV prieš uždarymą' },
        { value: outcomeText(signal.outcome) ?? 'Laukiama', label: 'rezultatas' },
      ]
    : []
  const footer = 'Visi signalai ir jų CLV: statyk rezultatai'
  const [bold, regular] = await Promise.all([
    displayFont(`Statyk${event}${facts.map((fact) => fact.value).join('')}`, 800),
    displayFont(`${pick}${facts.map((fact) => fact.label).join('')}${footer}`, 400),
  ])

  return new ImageResponse(
    (
      <OgFrame footer={footer}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 58, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', maxWidth: 1050 }}>{event}</div>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 400, color: OG.haze }}>{pick}</div>
          <div style={{ display: 'flex', gap: 64, marginTop: 24 }}>
            {facts.map((fact, index) => (
              <div key={fact.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 72,
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: index === 1 && clv !== null && clv > 0 ? OG.pitch : OG.chalk,
                  }}
                >
                  {fact.value}
                </div>
                <div style={{ display: 'flex', fontSize: 26, fontWeight: 400, color: OG.haze }}>{fact.label}</div>
              </div>
            ))}
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: ogFonts(bold, regular) },
  )
}
