import type { MetadataRoute } from 'next'

import { readContent } from '@/lib/content'
import type { SiteContent } from '@/lib/types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await readContent<SiteContent>('site')
  const base = site.seo.url
  const now = new Date()

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/obituary`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/credits`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]
}
