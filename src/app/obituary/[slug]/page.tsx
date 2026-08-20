import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Footer } from '@/components/Footer'
import { Navigation } from '@/components/Navigation'
import { Memorial } from '@/components/Memorial'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { getContent, readContent } from '@/lib/content'
import { idFromSlug, memorialSlug } from '@/lib/slug'
import type { ObituariesContent, SiteContent } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function find(slug: string) {
  const obituaries = await readContent<ObituariesContent>('obituaries')
  const id = idFromSlug(slug)
  return obituaries.items.find((person) => person.id === id) ?? null
}

/**
 * One page for one person, so a family can send a link to their own mother
 * rather than to a page of forty strangers — and so that link carries her name
 * and her photograph when it is pasted into WhatsApp.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const person = await find(slug)
  if (!person) return { title: 'Obituary' }

  const site = await readContent<SiteContent>('site')
  const years = `${person.born.slice(0, 4)} – ${person.died.slice(0, 4)}`
  const description = `${person.name.en}, ${person.house.en}. ${years}. Remembered by St. Thomas Church, Mangalassery.`

  return {
    title: person.name.en,
    description,
    alternates: { canonical: `${site.seo.url}/obituary/${memorialSlug(person)}` },
    openGraph: {
      type: 'profile',
      title: `${person.name.en} · ${years}`,
      description,
      images: person.image ? [{ url: person.image, width: 1200, height: 900 }] : undefined,
    },
    // A memorial is for the people who knew her, not for search engines.
    robots: { index: false, follow: true },
  }
}

export default async function MemorialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const person = await find(slug)
  if (!person) notFound()

  const content = await getContent()

  return (
    <>
      <ScrollProgress />
      <Navigation site={content.site} overHero={false} />

      <main className="page-body">
        <Memorial person={person} prayer={content.obituaries.prayer} />
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
