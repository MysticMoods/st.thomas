import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Navigation } from '@/components/Navigation'
import { HallBooking } from '@/components/hall/HallBooking'
import { HallIntro } from '@/components/hall/HallIntro'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { getContent } from '@/lib/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Parish Hall',
  description:
    'St. Thomas Parish Hall, Mangalassery — seating, tariff, air conditioning and generator, the free days of the coming year, and the booking request form.',
}

export default async function HallPage() {
  const content = await getContent()

  return (
    <>
      <ScrollProgress />
      <Navigation site={content.site} overHero={false} />

      {/* the fixed header sits over the page, so the hall starts below it */}
      <main className="page-body">
        <HallIntro hall={content.hall} />
        <HallBooking hall={content.hall} />
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
