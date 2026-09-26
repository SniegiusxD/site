import { ImageResponse } from 'next/og'
import { formatEdge, formatInteger, formatPercent } from '@/lib/format-lt'
import { displayFont, OG, OG_SIZE, OgFrame, ogFonts } from '@/lib/og'
import { summarize } from '@/lib/public-results'
import { loadPastSignals, RESULTS_WINDOW_DAYS } from '@/lib/public-results-store'
import { brand } from '@/lib/brand'

export const alt = `${brand.name} rezultatai: kiekvienas signalas prieš uždarymo kainą`
export const size = OG_SIZE
export const contentType = 'image/png'
// Same cadence as the page: the numbers on the card match what the link opens.
export const revalidate = 600

/** The results card: the live record, so a shared link carries the numbers. */
export default async function Image() {
  const signals = await loadPastSignals()
  const summary = signals ? summarize(signals) : null
  const has = summary !== null && summary.withClose > 0 && summary.beatClose !== null && summary.meanClv !== null

  const figures = has
    ? [
        { value: formatPercent(summary.beatClose!, 0), label: 'aplenkė uždarymo kainą' },
        { value: formatEdge(summary.meanClv!), label: 'vidutinis CLV' },
        { value: formatInteger(summary.withClose), label: 'signalų su uždarymu' },
      ]
    : []
  const title = 'Kiekvienas signalas prieš uždarymo kainą'
  const footer = `Paskutinės ${RESULTS_WINDOW_DAYS} dienų · nieko nerenkame ir netriname`

  const [bold, regular] = await Promise.all([
    displayFont(`${brand.name}${title}${figures.map((figure) => figure.value).join('')}`, 800),
    displayFont(`${figures.map((figure) => figure.label).join('')}${footer}`, 400),
  ])

  return new ImageResponse(
    (
      <OgFrame footer={footer}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em', maxWidth: 1000 }}>
            {title}
          </div>
          {has && (
            <div style={{ display: 'flex', gap: 72 }}>
              {figures.map((figure, index) => (
                <div key={figure.label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 96,
                      fontWeight: 800,
                      letterSpacing: '-0.04em',
                      color: index < 2 ? OG.pitch : OG.chalk,
                    }}
                  >
                    {figure.value}
                  </div>
                  <div style={{ display: 'flex', fontSize: 28, fontWeight: 400, color: OG.haze }}>{figure.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: ogFonts(bold, regular) },
  )
}
