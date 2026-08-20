import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Navigation } from '@/components/Navigation'
import { OfficeSections } from '@/components/office/OfficeForms'
import { OfficeIntro } from '@/components/office/OfficeIntro'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { EditableSection } from '@/components/admin/EditableSection'
import { getContent } from '@/lib/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Parish Office',
  description:
    'Ask St. Thomas Church, Mangalassery for a Holy Mass to be offered, for a baptism, marriage or death certificate from the parish registers, or for the parish to pray for something.',
}

export default async function OfficePage() {
  const content = await getContent()

  return (
    <>
      <ScrollProgress />
      <Navigation site={content.site} overHero={false} />

      {/* the fixed header sits over the page, so the office starts below it */}
      <main className="page-body">
        <EditableSection section="office" label="Parish Office">
          <OfficeIntro office={content.office} site={content.site} />
        </EditableSection>

        <OfficeSections office={content.office} />
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
