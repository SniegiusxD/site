/**
 * Shared pieces for the generated share images (next/og). Colours mirror the
 * tokens in app/globals.css; next/og cannot read CSS variables.
 */

import { brand } from '@/lib/brand'

export const OG_SIZE = { width: 1200, height: 630 }

export const OG = {
  night: '#06231a',
  stand: '#0e3a2b',
  rail: '#1c5a40',
  chalk: '#eaf6ee',
  haze: '#a9c9b8',
  pitch: '#5be584',
}

/**
 * Bricolage Grotesque for exactly the characters drawn, from Google Fonts. A
 * failure (no network at build) falls back to the default face rather than
 * failing the image.
 */
export async function displayFont(text: string, weight = 800): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@96,${weight}&text=${encodeURIComponent(text)}`,
      )
    ).text()
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    if (!url) return null
    return await (await fetch(url)).arrayBuffer()
  } catch {
    return null
  }
}

export function ogFonts(bold: ArrayBuffer | null, regular: ArrayBuffer | null) {
  return [
    ...(bold ? [{ name: 'Display', data: bold, weight: 800 as const, style: 'normal' as const }] : []),
    ...(regular ? [{ name: 'Display', data: regular, weight: 400 as const, style: 'normal' as const }] : []),
  ]
}

/** The frame every share image uses: brand top-left, content, domain bottom-left. */
export function OgFrame({ children, footer }: { children: React.ReactNode; footer: string }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: `radial-gradient(120% 90% at 0% 0%, ${OG.stand} 0%, ${OG.night} 60%)`,
        color: OG.chalk,
        fontFamily: 'Display',
      }}
    >
      <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em' }}>{brand.name}</div>
      {children}
      <div style={{ display: 'flex', fontSize: 26, fontWeight: 400, color: OG.haze }}>{footer}</div>
    </div>
  )
}
