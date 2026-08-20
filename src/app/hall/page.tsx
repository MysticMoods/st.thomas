import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Navigation } from '@/components/Navigation'
import { HallBooking } from '@/components/hall/HallBooking'
import { HallIntro } from '@/components/hall/HallIntro'
import { HallReviews } from '@/components/hall/HallReviews'
import { HallRooms } from '@/components/hall/HallRooms'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { EditableSection } from '@/components/admin/EditableSection'
import { getContent } from '@/lib/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Parish Halls',
  description:
    'The three parish halls at St. Thomas Church, Mangalassery — small, medium and large, air conditioning, generator and stage, tariff, free days of the coming year and the booking request form.',
}

export default async function HallPage() {
  const content = await getContent()

  return (
    <>
      <ScrollProgress />
      <Navigation site={content.site} overHero={false} />

      {/* the fixed header sits over the page, so the hall starts below it */}
      <main className="page-body">
        <EditableSection section="hall" label="Parish Hall">
          <HallIntro hall={content.hall} />
        </EditableSection>
        <EditableSection section="hall" label="The three halls">
          <HallRooms hall={content.hall} />
        </EditableSection>
        <HallBooking hall={content.hall} />
        <HallReviews hall={content.hall} />
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
