import { About } from '@/components/About'
import { Ads } from '@/components/Ads'
import { Clergy } from '@/components/Clergy'
import { Committee } from '@/components/Committee'
import { Contact } from '@/components/Contact'
import { Donation } from '@/components/Donation'
import { Footer } from '@/components/Footer'
import { Gallery } from '@/components/Gallery'
import { HallPromo } from '@/components/HallPromo'
import { Hero } from '@/components/Hero'
import { Leadership } from '@/components/Leadership'
import { Chapels } from '@/components/Chapels'
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
import { WeeklyCalendar } from '@/components/WeeklyCalendar'
import { BackToTop, ScrollProgress } from '@/components/ui/Chrome'
import { ParallaxBand } from '@/components/ui/ParallaxBand'
import { EditableSection } from '@/components/admin/EditableSection'
import { getContent } from '@/lib/content'
import { withLatestUploads } from '@/lib/youtube'
import { isConfigured } from '@/lib/razorpay'

/**
 * Read content/*.json on every request rather than serving a cached snapshot.
 * Dashboard saves, a hand-edited JSON file, a git pull or a restored backup all
 * show up immediately — there is no window in which the page is stale.
 */
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const content = await getContent()
  // Newest uploads from the parish YouTube channel, ahead of the written-up ones.
  const media = await withLatestUploads(content.media)
  // Read on the server so the giving form knows, before it is ever shown,
  // whether the checkout can open at all.
  const gatewayReady = isConfigured()

  return (
    <>
      <ScrollProgress />
      <Navigation site={content.site} />

      <main>
        <EditableSection section="site" label="Homepage & Banners">
          <Hero site={content.site} />
        </EditableSection>
        <EditableSection section="about" label="About the Church">
          <About about={content.about} site={content.site} />
        </EditableSection>
        <EditableSection section="leadership" label="Pope, Archbishop & Bishop">
          <Leadership leadership={content.leadership} />
        </EditableSection>

        <EditableSection section="clergy" label="Parish Priest">
          <Clergy clergy={content.clergy} />
        </EditableSection>
        <EditableSection section="committee" label="Parish Council">
          <Committee committee={content.committee} />
        </EditableSection>

        <ParallaxBand
          image="/images/site/votive.jpg"
          verse={{
            en: 'Remember your leaders, who spoke the word of God to you.',
            ml: 'ദൈവവചനം നിങ്ങളോട് പ്രസംഗിച്ച നിങ്ങളുടെ നായകന്മാരെ ഓർക്കുവിൻ.',
          }}
          attribution={{ en: 'Hebrews 13:7', ml: 'ഹെബ്രായർ 13:7' }}
          height="sm"
        />

        <EditableSection section="past-priests" label="Past Priests">
          <PastPriestsTimeline pastPriests={content.pastPriests} />
        </EditableSection>
        <EditableSection section="stats" label="Parish Statistics">
          <Stats stats={content.stats} />
        </EditableSection>

        <ParallaxBand
          image="/images/site/candles-cross.jpg"
          verse={{
            en: 'Where two or three are gathered in my name, there am I among them.',
            ml: 'രണ്ടോ മൂന്നോ പേർ എന്റെ നാമത്തിൽ ഒരുമിച്ചു കൂടുന്നിടത്ത് ഞാൻ അവരുടെ മധ്യേ ഉണ്ട്.',
          }}
          attribution={{ en: 'Matthew 18:20', ml: 'മത്തായി 18:20' }}
        />

        <EditableSection section="mass" label="Mass Timings">
          <MassTimings mass={content.mass} />
        </EditableSection>
        <EditableSection section="chapels" label="Chapels">
          <Chapels chapels={content.chapels} />
        </EditableSection>
        <EditableSection section="events" label="Weekly Events">
          <WeeklyCalendar events={content.events} />
        </EditableSection>

        <ParallaxBand image="/images/site/hero-vault.jpg" height="sm" strength={0.34} />

        <EditableSection section="ministries" label="Ministries">
          <Ministries ministries={content.ministries} />
        </EditableSection>
        <EditableSection section="media" label="Videos & Bulletins">
          <Media media={media} />
        </EditableSection>

        <EditableSection section="donation" label="Donations">
          <Donation
            donation={content.donation}
            gatewayReady={gatewayReady}
            parishName={`${content.site.parish.name.en}, ${content.site.parish.place.en}`}
          />
        </EditableSection>

        <EditableSection section="notices" label="Notice Board">
          <Notices notices={content.notices} />
        </EditableSection>
        <EditableSection section="gallery" label="Gallery">
          <Gallery gallery={content.gallery} />
        </EditableSection>
        <EditableSection section="obituaries" label="Obituary Column">
          <Obituaries obituaries={content.obituaries} />
        </EditableSection>

        <ParallaxBand image="/images/site/steeple.jpg" height="sm" strength={0.34} />

        <EditableSection section="hall" label="Parish Hall">
          <HallPromo hall={content.hall} />
        </EditableSection>
        <Members stats={content.stats} />
        <Newsletter site={content.site} />
        <Contact site={content.site} />
        <EditableSection section="ads" label="Advertisements">
          <Ads ads={content.ads} place="home" />
        </EditableSection>
      </main>

      <Footer site={content.site} mass={content.mass} notices={content.notices} />
      <BackToTop />
    </>
  )
}
