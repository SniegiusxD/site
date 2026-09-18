import type { MetadataRoute } from 'next'
import { brand } from '@/lib/brand'

/** Lets members add the site to the home screen; opens straight on the signals board. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.description,
    lang: 'lt',
    start_url: '/signalai',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#06231a',
    theme_color: '#06231a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
