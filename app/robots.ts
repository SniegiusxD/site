import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/skaiciuokle', '/taisykles', '/privatumas'],
      // Account pages and APIs are private and useless to crawlers.
      disallow: ['/api/', '/signalai', '/statymai', '/profilis', '/pradzia', '/atrakinti', '/pagalba', '/savininkas'],
    },
    sitemap: `${
      process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3100'
    }/sitemap.xml`,
  }
}
