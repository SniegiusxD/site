import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Big_Shoulders, Schibsted_Grotesk } from 'next/font/google'
import { MotionProvider } from '@/components/motion-provider'
import { brand } from '@/lib/brand'
import './globals.css'

// latin-ext carries ą č ę ė į š ų ū ž. Without it Lithuanian text silently
// falls back to a different typeface mid-word.
// The opsz axis lets headlines use the condensed display cut automatically.
const display = Big_Shoulders({
  variable: '--font-display-face',
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz'],
  display: 'swap',
})

const text = Schibsted_Grotesk({
  variable: '--font-text-face',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: `${brand.name}: kur Lietuvos kontoros moka daugiau, nei verta`,
  description: brand.description,
  icons: { icon: '/icon.svg' },
  // Absolute URLs for the share image. Replace with the real domain once registered.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3100',
  ),
  openGraph: {
    type: 'website',
    locale: 'lt_LT',
    siteName: brand.name,
    title: `${brand.name}: kur Lietuvos kontoros moka daugiau, nei verta`,
    description: brand.description,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: `${brand.name}: signalai su visų kontorų kainomis` }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og.png'],
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0A1020',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="lt" className={`${display.variable} ${text.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        <MotionProvider>{children}</MotionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
