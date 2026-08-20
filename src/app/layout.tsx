import type { Metadata, Viewport } from 'next'

import { AdminBar, AdminModeProvider } from '@/components/admin/AdminMode'
import { Providers } from '@/components/Providers'
import { ServiceWorker } from '@/components/ServiceWorker'
import { isAuthenticated } from '@/lib/auth'
import { readContent } from '@/lib/content'
import { themeScript } from '@/lib/theme'
import type { SiteContent } from '@/lib/types'

import './globals.css'

const FONTS =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;600&family=Noto+Sans+Malayalam:wght@300;400;500;600;700&display=swap'

export async function generateMetadata(): Promise<Metadata> {
  const site = await readContent<SiteContent>('site')
  const url = site.seo.url

  return {
    metadataBase: new URL(url),
    title: {
      default: `${site.seo.title} · ${site.parish.place.en}`,
      template: `%s · ${site.seo.title}`,
    },
    description: site.seo.description,
    keywords: site.seo.keywords,
    applicationName: site.seo.title,
    authors: [{ name: site.seo.title }],
    alternates: {
      canonical: url,
      languages: { en: url, ml: `${url}?lang=ml` },
    },
    openGraph: {
      type: 'website',
      url,
      siteName: site.seo.title,
      title: `${site.seo.title}, ${site.parish.place.en}`,
      description: site.seo.description,
      locale: 'en_IN',
      alternateLocale: ['ml_IN'],
      images: [{ url: site.seo.ogImage, width: 1440, height: 810, alt: site.seo.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: site.seo.title,
      description: site.seo.description,
      images: [site.seo.ogImage],
    },
    robots: { index: true, follow: true },
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
      apple: '/apple-icon.png',
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF8F3' },
    { media: '(prefers-color-scheme: dark)', color: '#080D18' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The session cookie is read here, so the whole site knows whether a member
  // of staff is looking at it.
  const isAdmin = await isAuthenticated()
  const site = await readContent<SiteContent>('site')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'PlaceOfWorship',
    name: `${site.parish.name.en}, ${site.parish.place.en}`,
    alternateName: `${site.parish.name.ml}, ${site.parish.place.ml}`,
    url: site.seo.url,
    image: `${site.seo.url}${site.seo.ogImage}`,
    description: site.seo.description,
    telephone: site.contact.phone,
    email: site.contact.email,
    foundingDate: site.parish.established,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Church Hill Road, Mangalassery P.O.',
      addressLocality: 'Thrissur',
      addressRegion: 'Kerala',
      postalCode: '680121',
      addressCountry: 'IN',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.contact.coordinates.lat,
      longitude: site.contact.coordinates.lng,
    },
    sameAs: site.social.filter((s) => s.url.startsWith('http')).map((s) => s.url),
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONTS} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Providers>
          <AdminModeProvider isAdmin={isAdmin}>
            <AdminBar />
            {children}
          </AdminModeProvider>
        </Providers>
        <ServiceWorker />
      </body>
    </html>
  )
}
