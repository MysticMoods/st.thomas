'use client'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'
import { SmartImage } from '../ui/SmartImage'

/**
 * Section 03 — the day told in order, from asking for it to handing the keys
 * back. A venue site sells the evening; a parish one explains it.
 */
export function HallStory({ hall }: { hall: HallContent }) {
  const { t, lang } = useLang()

  return (
    <section id="day" className="hall-anchor section-tight bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: '03 · The day', ml: '03 · ദിവസം' }}
          title={{ en: 'How a day here runs', ml: 'ഇവിടെ ഒരു ദിവസം എങ്ങനെ' }}
          subtitle={{
            en: 'From the first telephone call to the keys going back on the hook the next morning.',
            ml: 'ആദ്യത്തെ ഫോൺ വിളി മുതൽ അടുത്ത പ്രഭാതത്തിൽ താക്കോൽ തിരികെ ഏൽപ്പിക്കുന്നതു വരെ.',
          }}
        />

        <div className="mt-14 flex flex-col gap-12 lg:mt-20 lg:gap-20">
          {hall.story.map((step, i) => (
            <Reveal key={step.title.en} delay={0.04}>
              <article
                className={cn(
                  'grid items-center gap-8 lg:grid-cols-2 lg:gap-14',
                  i % 2 === 1 && 'lg:[&>figure]:order-2',
                )}
              >
                <figure className="overflow-hidden rounded-sm">
                  <SmartImage
                    src={step.image}
                    alt=""
                    width={900}
                    height={640}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    wrapperClassName="aspect-[7/5] w-full"
                    className="h-full w-full object-cover"
                  />
                </figure>

                <div>
                  <span className="font-display text-5xl leading-none text-gold-400/35 tabular-nums">
                    {`${i + 1}`.padStart(2, '0')}
                  </span>
                  <h3 className="heading-md mt-4 text-[rgb(var(--ink))]">{t(step.title)}</h3>
                  <span className="mt-5 block gold-rule" aria-hidden="true" />
                  <p className="body-text mt-6" lang={lang}>
                    {t(step.body)}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
