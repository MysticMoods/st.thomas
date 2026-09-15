import type { Metadata } from 'next'

import { Footer } from '@/components/Footer'
import { Navigation } from '@/components/Navigation'
import { ObituaryArchive } from '@/components/Obituaries'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { EditableSection } from '@/components/admin/EditableSection'
import { getContent } from '@/lib/content'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Obituary',
  description:
    'The obituary column of St. Thomas Church, Mangalassery — parishioners who have died, their funeral details and the prayer of the parish for them.',
}

export default async function ObituaryPage() {
  const content = await getContent()

  return (
    <>
      <ScrollProgress />
      <Navigation site={content.site} overHero={false} />

      {/* the fixed header sits over the page, so the column starts below it */}
      <main className="page-body">
        <EditableSection section="obituaries" label="Obituary Column">
          <ObituaryArchive obituaries={content.obituaries} />
        </EditableSection>
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
