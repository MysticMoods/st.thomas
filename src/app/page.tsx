import { About } from '@/components/About'
import { Clergy } from '@/components/Clergy'
import { Contact } from '@/components/Contact'
import { Feast } from '@/components/Feast'
import { Footer } from '@/components/Footer'
import { Gallery } from '@/components/Gallery'
import { Hero } from '@/components/Hero'
import { MassTimings } from '@/components/MassTimings'
import { Media } from '@/components/Media'
import { Members } from '@/components/Members'
import { Ministries } from '@/components/Ministries'
import { Navigation } from '@/components/Navigation'
import { Newsletter } from '@/components/Newsletter'
import { Notices } from '@/components/Notices'
import { PastPriestsTimeline } from '@/components/PastPriestsTimeline'
import { Stats } from '@/components/Stats'
import { WeeklyCalendar } from '@/components/WeeklyCalendar'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { getContent } from '@/lib/content'

export const revalidate = 300

export default async function HomePage() {
  const content = await getContent()

  return (
    <>
      <ScrollProgress />
      <Navigation site={content.site} />

      <main>
        <Hero site={content.site} />
        <About about={content.about} site={content.site} />
        <MassTimings mass={content.mass} />
        <WeeklyCalendar events={content.events} />
        <Clergy clergy={content.clergy} />
        <Stats stats={content.stats} />
        <Ministries ministries={content.ministries} />
        <PastPriestsTimeline pastPriests={content.pastPriests} />
        <Gallery gallery={content.gallery} />
        <Media media={content.media} />
        <Feast feast={content.feast} />
        <Notices notices={content.notices} />
        <Members stats={content.stats} />
        <Newsletter site={content.site} />
        <Contact site={content.site} />
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
