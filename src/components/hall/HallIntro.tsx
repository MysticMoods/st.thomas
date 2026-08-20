'use client'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'
import { SmartImage } from '../ui/SmartImage'

export function HallIntro({ hall }: { hall: HallContent }) {
  const { t, lang } = useLang()

  return (
    <section className="section-first bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'For your gathering', ml: 'നിങ്ങളുടെ ഒത്തുചേരലിന്' }}
          title={hall.title}
          subtitle={hall.subtitle}
          level={1}
        />

        <Reveal>
          <div className="mt-14 overflow-hidden rounded-sm">
            <SmartImage
              src={hall.image}
              alt={t(hall.title)}
              width={1440}
              height={810}
              priority
              sizes="100vw"
              wrapperClassName="aspect-[16/9] w-full"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div>
            <h2 className="heading-md">{t({ en: 'What can be arranged', ml: 'എന്തൊക്കെ ക്രമീകരിക്കാം' })}</h2>
            <span className="mt-5 block gold-rule" aria-hidden="true" />
            <ul className="mt-8 divide-y divide-[rgb(var(--line))] border-y border-[rgb(var(--line))]">
              {hall.amenities.map((amenity) => (
                <li key={amenity.id} className="flex items-baseline justify-between gap-6 py-4">
                  <span className="min-w-0">
                    <span className="block font-sans text-[0.95rem] text-[rgb(var(--ink))]">
                      {t(amenity.label)}
                    </span>
                    <span className="block font-sans text-2xs text-[rgb(var(--muted))]">
                      {t(amenity.note)}
                    </span>
                  </span>
                  <span className="shrink-0 font-sans text-sm tabular-nums text-gold-600 dark:text-gold-400">
                    ₹{formatNumber(amenity.rate, lang)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="heading-md">{t({ en: 'House rules', ml: 'നിബന്ധനകൾ' })}</h2>
            <span className="mt-5 block gold-rule" aria-hidden="true" />
            <ul className="mt-8 flex flex-col gap-4">
              {hall.rules.map((rule) => (
                <li key={rule.en} className="flex gap-3">
                  <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-gold-500" />
                  <span className="font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
                    {t(rule)}
                  </span>
                </li>
              ))}
            </ul>

            <a href="#halls" className="btn-primary mt-9">
              {t({ en: 'See the three halls', ml: 'മൂന്ന് ഹാളുകൾ കാണുക' })}
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
