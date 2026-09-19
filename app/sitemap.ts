import type { MetadataRoute } from 'next'

// Replace with the real domain once registered (same rule as metadataBase in app/layout.tsx).
const BASE = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : 'http://localhost:3100'

const PUBLIC_PAGES = ['', '/demo', '/metodika', '/skaiciuokle', '/registracija', '/prisijungti', '/taisykles', '/privatumas']

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === '' ? 'daily' : 'monthly',
    // The demo and the method are what a sceptical visitor actually reads.
    priority: path === '' ? 1 : ['/demo', '/metodika', '/skaiciuokle'].includes(path) ? 0.8 : 0.4,
  }))
}
