import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/taisykles', '/privatumas'],
      // Account pages and APIs are private and useless to crawlers.
      disallow: ['/api/', '/signalai', '/statymai', '/profilis', '/pradzia'],
    },
  }
}
