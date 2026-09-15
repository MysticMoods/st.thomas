import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'St. Thomas Church, Mangalassery',
    short_name: 'St. Thomas',
    description:
      'Mass timings, parish news, ministries and gallery for St. Thomas Church, Mangalassery.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FBF8F3',
    theme_color: '#0B1526',
    lang: 'en',
    categories: ['lifestyle', 'education'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Mass Timings', url: '/#mass-timings' },
      { name: 'Notice Board', url: '/#notices' },
      { name: 'Contact', url: '/#contact' },
    ],
  }
}
