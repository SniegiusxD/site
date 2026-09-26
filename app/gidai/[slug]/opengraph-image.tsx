import { ImageResponse } from 'next/og'
import { GUIDES, guideBySlug } from '@/lib/guides'
import { displayFont, OG, OG_SIZE, OgFrame, ogFonts } from '@/lib/og'
import { brand } from '@/lib/brand'

export const alt = `${brand.name} gidas`
export const size = OG_SIZE
export const contentType = 'image/png'

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }))
}

/** A guide's card: its title and how long it takes to read. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug)
  const title = guide?.title ?? 'Gidai'
  const kicker = 'Gidas'
  const footer = guide ? `${guide.minutes} min. skaitymo · paprastai ir be pažadų` : 'Paprastai ir be pažadų'
  const [bold, regular] = await Promise.all([displayFont(`${brand.name}${title}`, 800), displayFont(`${kicker}${footer}`, 400)])

  return new ImageResponse(
    (
      <OgFrame footer={footer}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 400, color: OG.pitch }}>{kicker}</div>
          <div style={{ display: 'flex', fontSize: 84, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em', maxWidth: 1040 }}>
            {title}
          </div>
        </div>
      </OgFrame>
    ),
    { ...size, fonts: ogFonts(bold, regular) },
  )
}
