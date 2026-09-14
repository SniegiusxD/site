import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Big_Shoulders, Schibsted_Grotesk } from 'next/font/google'
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
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#EEF1F4',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="lt" className={`${display.variable} ${text.variable}`}>
      <body className="bg-background text-foreground font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
