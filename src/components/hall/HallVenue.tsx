'use client'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'

import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'
import { SmartImage } from '../ui/SmartImage'

/** Section 01 — where the halls are, and the four things people ask first. */
export function HallVenue({ hall }: { hall: HallContent }) {
  const { t } = useLang()

  return (
    <section id="venue" className="hall-anchor section-tight bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          align="left"
          eyebrow={{ en: '01 · The venue', ml: '01 · വേദി' }}
          title={{
            en: 'Beside the church, under one roof',
            ml: 'ദേവാലയത്തിനരികിൽ, ഒരേ മേൽക്കൂരയ്ക്ക് കീഴിൽ',
          }}
        />

        <div className="mt-12 grid items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <Reveal>
            <div className="overflow-hidden rounded-sm">
              <SmartImage
                src={hall.image}
                alt={t(hall.title)}
                width={1200}
                height={800}
                sizes="(min-width: 1024px) 55vw, 100vw"
                wrapperClassName="aspect-[4/3] w-full"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="body-text">
              {t({
                en: 'The halls stand in the same compound as the church, so a wedding walks from the altar to the reception without anyone reaching for a car. The parish keeps them, lets them by the session, and answers the telephone itself.',
                ml: 'ഹാളുകൾ ദേവാലയത്തിന്റെ അതേ വളപ്പിലാണ് — വിവാഹത്തിന് അൾത്താരയിൽ നിന്ന് സ്വീകരണത്തിലേക്ക് ആരും വാഹനം തേടേണ്ടതില്ല. ഇടവക തന്നെയാണ് അവ പരിപാലിക്കുന്നതും സെഷൻ അടിസ്ഥാനത്തിൽ നൽകുന്നതും ഫോൺ എടുക്കുന്നതും.',
              })}
            </p>

            <dl className="mt-9 divide-y divide-[rgb(var(--line))] border-y border-[rgb(var(--line))]">
              {hall.facts.map((fact) => (
                <div key={fact.label.en} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-4">
                  <dt className="w-28 shrink-0 font-sans text-2xs uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400">
                    {t(fact.label)}
                  </dt>
                  <dd className="min-w-0 flex-1 font-sans text-[0.95rem] text-[rgb(var(--ink))]">
                    {t(fact.value)}
                  </dd>
                </div>
              ))}
            </dl>

            <a href="#halls" className="btn-primary mt-9">
              {t({ en: 'See the three halls', ml: 'മൂന്ന് ഹാളുകൾ കാണുക' })}
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
