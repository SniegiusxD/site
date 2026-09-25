import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Schibsted_Grotesk } from 'next/font/google'
import { ErrorReporter } from '@/components/error-reporter'
import { MotionProvider } from '@/components/motion-provider'
import { brand } from '@/lib/brand'
import { MOTION_BOOT_SCRIPT } from '@/lib/motion-mode'
import './globals.css'

// latin-ext carries ą č ę ė į š ų ū ž. Without it Lithuanian text silently
// falls back to a different typeface mid-word.
// Bricolage Grotesque replaced the condensed Big Shoulders (owner: headlines felt like a
// slide deck). The opsz axis tightens large headlines automatically.
const display = Bricolage_Grotesque({
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
  icons: { icon: '/icon.svg', apple: '/apple-icon.png' },
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
    // Images come from app/opengraph-image.tsx (and per-page ones such as
    // app/rezultatai/opengraph-image.tsx). The old /og.png still said "Kraštas".
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#06231A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // The boot script writes data-motion before hydration; that attribute is
    // meant to differ from the server HTML.
    <html lang="lt" suppressHydrationWarning className={`${display.variable} ${text.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        {/* Picks the motion mode before the first frame, so nothing flickers. */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
        <ErrorReporter />
        <MotionProvider>{children}</MotionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
