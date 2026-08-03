'use client'

import { useLang } from '@/lib/i18n'
import type { AboutContent, SiteContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { ParishEmblem } from './ui/ParishEmblem'
import { Reveal, StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'
import { motion } from 'framer-motion'

export function About({ about, site }: { about: AboutContent; site: SiteContent }) {
  const { t } = useLang()

  return (
    <section id="about" className="section grain relative bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={about.intro.eyebrow}
          title={about.intro.title}
          subtitle={about.intro.lede}
        />

        <StaggerGroup className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {about.cards.map((card, i) => (
            <motion.article
              key={card.id}
              variants={staggerItem}
              className={cn(
                'card card-hover group flex flex-col',
                i === 0 && 'sm:col-span-2 lg:col-span-2',
              )}
            >
              <SmartImage
                src={card.image}
                alt={t(card.title)}
                width={1200}
                height={800}
                zoom
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                wrapperClassName={cn('w-full', i === 0 ? 'aspect-[16/9]' : 'aspect-[3/2]')}
                className="h-full w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-4 p-7 sm:p-9">
                <span className="eyebrow">{t(card.kicker)}</span>
                <h3 className="heading-md">{t(card.title)}</h3>
                <span className="gold-rule w-14 opacity-70" aria-hidden="true" />
                <p className="body-text">{t(card.body)}</p>
              </div>
            </motion.article>
          ))}
        </StaggerGroup>

        {/* emblem + parish register */}
        <div className="mt-24 grid items-center gap-14 lg:mt-32 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20">
          <Reveal direction="right">
            <div className="relative mx-auto flex max-w-md flex-col items-center rounded-sm border border-gold-400/25 bg-gradient-to-b from-navy-900 to-navy-950 p-12 text-center shadow-sacred">
              <div className="absolute inset-3 border border-gold-400/15" aria-hidden="true" />
              <ParishEmblem variant="gold" className="h-36 w-36" />
              <h3 className="mt-8 font-display text-2xl text-white">{t(about.logo.title)}</h3>
              <span className="mt-4 h-px w-16 bg-gold-line" aria-hidden="true" />
              <p className="mt-5 font-sans text-sm leading-relaxed text-stone-300/85">
                {t(about.logo.description)}
              </p>
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <div>
              <span className="eyebrow">{t({ en: 'Parish Information', ml: 'ഇടവക വിവരങ്ങൾ' })}</span>
              <h3 className="mt-4 heading-lg">{t(site.parish.tagline)}</h3>
              <span className="mt-6 block gold-rule" aria-hidden="true" />

              <dl className="mt-10 divide-y divide-[rgb(var(--line))] border-y border-[rgb(var(--line))]">
                {about.parishInfo.map((row) => (
                  <div
                    key={t(row.label)}
                    className="grid gap-1 py-5 sm:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)] sm:gap-8"
                  >
                    <dt className="font-sans text-2xs uppercase tracking-[0.22em] text-gold-600 dark:text-gold-400">
                      {t(row.label)}
                    </dt>
                    <dd className="font-serif text-lg text-[rgb(var(--ink))]">{t(row.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
