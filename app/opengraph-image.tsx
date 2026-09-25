import { ImageResponse } from 'next/og'
import { brand } from '@/lib/brand'
import { displayFont, OG, OG_SIZE, OgFrame, ogFonts } from '@/lib/og'

export const alt = `${brand.name}: kur Lietuvos kontoros moka daugiau, nei verta`
export const size = OG_SIZE
export const contentType = 'image/png'

const HEADLINE = 'Kai kontora suklysta, tu tai matai pirmas'
const LEAD = '7BET, TopSport ir Betsson koeficientai prieš Pinnacle kainą be maržos.'
const BOOKS = ['7BET', 'TopSport', 'Betsson']
const FOOTER = 'Registracija nemokama'

/** The default share card for every page that has no card of its own. */
export default async function Image() {
  const [bold, regular] = await Promise.all([
    displayFont(`Statyk${HEADLINE}${BOOKS.join('')}`, 800),
    displayFont(`${LEAD}${FOOTER}`, 400),
  ])
  return new ImageResponse(
    (
      <OgFrame footer={FOOTER}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.035em', maxWidth: 980 }}>
            {HEADLINE}
          </div>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 400, color: OG.haze, maxWidth: 900 }}>{LEAD}</div>
          <div style={{ display: 'flex', gap: 14 }}>
            {BOOKS.map((book) => (
              <div
                key={book}
                style={{
                  display: 'flex',
                  padding: '10px 22px',
                  borderRadius: 999,
                  border: `2px solid ${OG.rail}`,
                  fontSize: 26,
                  fontWeight: 800,
                  color: OG.pitch,
                }}
              >
                {book}
              </div>
            ))}
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: ogFonts(bold, regular) },
  )
}
