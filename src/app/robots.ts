import type { MetadataRoute } from 'next'

import { readContent } from '@/lib/content'
import type { SiteContent } from '@/lib/types'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await readContent<SiteContent>('site')

  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: `${site.seo.url}/sitemap.xml`,
  }
}
