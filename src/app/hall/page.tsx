import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Navigation } from '@/components/Navigation'
import { HallBooking } from '@/components/hall/HallBooking'
import { HallCta } from '@/components/hall/HallCta'
import { HallFacilities } from '@/components/hall/HallFacilities'
import { HallFaq } from '@/components/hall/HallFaq'
import { HallHero } from '@/components/hall/HallHero'
import { HallReviews } from '@/components/hall/HallReviews'
import { HallRooms } from '@/components/hall/HallRooms'
import { HallStats } from '@/components/hall/HallStats'
import { HallStory } from '@/components/hall/HallStory'
import { HallVenue } from '@/components/hall/HallVenue'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { EditableSection } from '@/components/admin/EditableSection'
import { getContent } from '@/lib/content'
import { isConfigured } from '@/lib/razorpay'

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
      <Navigation site={content.site} overHero variant="hall" />

      <main>
        <EditableSection section="hall" label="Hall page">
          <HallHero hall={content.hall} />
        </EditableSection>

        <HallStats hall={content.hall} />
        <HallVenue hall={content.hall} />

        <EditableSection section="hall" label="The three halls">
          <HallRooms hall={content.hall} />
        </EditableSection>

        <HallStory hall={content.hall} />
        <HallFacilities hall={content.hall} />
        <HallBooking hall={content.hall} gatewayReady={isConfigured()} />
        <HallReviews hall={content.hall} />

        <EditableSection section="hall" label="Questions & rules">
          <HallFaq hall={content.hall} />
        </EditableSection>

        <HallCta hall={content.hall} />
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
