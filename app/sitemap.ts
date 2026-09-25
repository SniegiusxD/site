import type { MetadataRoute } from 'next'
import { GUIDES } from '@/lib/guides'

// Replace with the real domain once registered (same rule as metadataBase in app/layout.tsx).
const BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3100'

const PUBLIC_PAGES = ['', '/rezultatai', '/demo', '/metodika', '/skaiciuokle', '/gidai', ...GUIDES.map((guide) => `/gidai/${guide.slug}`), '/registracija', '/prisijungti', '/taisykles', '/privatumas']

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '' ? 'daily' : 'monthly',
    // The demo and the method are what a sceptical visitor actually reads.
    priority: path === '' ? 1 : ['/rezultatai', '/demo', '/metodika', '/skaiciuokle'].includes(path) || path.startsWith('/gidai') ? 0.8 : 0.4,
  }))
}
