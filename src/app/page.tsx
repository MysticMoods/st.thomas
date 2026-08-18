import { About } from '@/components/About'
import { Clergy } from '@/components/Clergy'
import { Committee } from '@/components/Committee'
import { Contact } from '@/components/Contact'
import { Donation } from '@/components/Donation'
import { EventPopup } from '@/components/EventPopup'
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
import { Obituaries } from '@/components/Obituaries'
import { PastPriestsTimeline } from '@/components/PastPriestsTimeline'
import { Stats } from '@/components/Stats'
import { UpcomingEvents } from '@/components/UpcomingEvents'
import { WeeklyCalendar } from '@/components/WeeklyCalendar'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { ParallaxBand } from '@/components/ui/ParallaxBand'
import { getContent } from '@/lib/content'
import { isConfigured } from '@/lib/razorpay'

/**
 * Read content/*.json on every request rather than serving a cached snapshot.
 * Dashboard saves, a hand-edited JSON file, a git pull or a restored backup all
 * show up immediately — there is no window in which the page is stale.
 */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const content = await getContent()
  // Read on the server so the giving form knows, before it is ever shown,
  // whether the checkout can open at all.
  const gatewayReady = isConfigured()

  return (
    <>
      <ScrollProgress />
      <Navigation site={content.site} />
      <EventPopup upcoming={content.upcoming} />

      <main>
        <Hero site={content.site} />
        <About about={content.about} site={content.site} />

        <ParallaxBand
          image="/images/site/candles-cross.jpg"
          verse={{
            en: 'Where two or three are gathered in my name, there am I among them.',
            ml: 'രണ്ടോ മൂന്നോ പേർ എന്റെ നാമത്തിൽ ഒരുമിച്ചു കൂടുന്നിടത്ത് ഞാൻ അവരുടെ മധ്യേ ഉണ്ട്.',
          }}
          attribution={{ en: 'Matthew 18:20', ml: 'മത്തായി 18:20' }}
        />

        <MassTimings mass={content.mass} />
        <UpcomingEvents upcoming={content.upcoming} />
        <WeeklyCalendar events={content.events} />

        <ParallaxBand image="/images/site/hero-vault.jpg" height="sm" strength={0.34} />

        <Clergy clergy={content.clergy} />
        <Committee committee={content.committee} />
        <Stats stats={content.stats} />
        <Ministries ministries={content.ministries} />

        <ParallaxBand
          image="/images/site/votive.jpg"
          verse={{
            en: 'Remember your leaders, who spoke the word of God to you.',
            ml: 'ദൈവവചനം നിങ്ങളോട് പ്രസംഗിച്ച നിങ്ങളുടെ നായകന്മാരെ ഓർക്കുവിൻ.',
          }}
          attribution={{ en: 'Hebrews 13:7', ml: 'ഹെബ്രായർ 13:7' }}
          height="sm"
        />

        <PastPriestsTimeline pastPriests={content.pastPriests} />
        <Gallery gallery={content.gallery} />
        <Media media={content.media} />

        <Donation
          donation={content.donation}
          gatewayReady={gatewayReady}
          parishName={`${content.site.parish.name.en}, ${content.site.parish.place.en}`}
        />

        <Notices notices={content.notices} />
        <Obituaries obituaries={content.obituaries} />

        <ParallaxBand image="/images/site/steeple.jpg" height="sm" strength={0.34} />

        <Members stats={content.stats} />
        <Newsletter site={content.site} />
        <Contact site={content.site} />
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
