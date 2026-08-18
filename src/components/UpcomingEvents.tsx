'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

import { useLang } from '@/lib/i18n'
import type { UpcomingContent, UpcomingEvent } from '@/lib/types'
import { cn, formatDate, formatNumber } from '@/lib/utils'

import { futureEvents } from './EventPopup'
import { Icon } from './ui/Icon'
import { StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

const CATEGORY_TONE: Record<string, string> = {
  feast: 'border-gold-400/70 text-gold-700 dark:text-gold-300',
  liturgy: 'border-navy-300/60 text-navy-600 dark:border-navy-500/50 dark:text-navy-200',
  prayer: 'border-stone-400/60 text-stone-600 dark:text-stone-300',
  community: 'border-burgundy-300/70 text-burgundy-500 dark:text-burgundy-300',
  catechism: 'border-gold-500/50 text-gold-700 dark:text-gold-400',
}

const CATEGORY_LABEL: Record<string, { en: string; ml: string }> = {
  feast: { en: 'Feast', ml: 'തിരുനാൾ' },
  liturgy: { en: 'Liturgy', ml: 'തിരുക്കർമ്മം' },
  prayer: { en: 'Prayer', ml: 'പ്രാർത്ഥന' },
  community: { en: 'Community', ml: 'സമൂഹം' },
  catechism: { en: 'Catechism', ml: 'മതബോധനം' },
}

/**
 * The dated events of the parish calendar, in one column that runs down the
 * page. The weekly rhythm has its own section below this one; anything with a
 * date of its own belongs here, and drops off the list once it has passed.
 */
export function UpcomingEvents({ upcoming }: { upcoming: UpcomingContent }) {
  const { t, lang } = useLang()
  const events = useMemo(() => futureEvents(upcoming.events), [upcoming.events])

  if (events.length === 0) return null

  const [first, ...rest] = events

  return (
    <section id="upcoming" className="section bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'The months ahead', ml: 'വരും മാസങ്ങൾ' }}
          title={upcoming.title}
          subtitle={upcoming.subtitle}
        />

        <div className="mt-16 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
          <FeatureCard event={first} />

          <StaggerGroup className="flex flex-col gap-4">
            {rest.map((event) => (
              <motion.article
                key={event.id}
                variants={staggerItem}
                className="card card-hover group flex gap-5 p-5 sm:p-6"
              >
                <DateBlock date={event.date} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 font-sans text-[0.58rem] font-semibold uppercase tracking-[0.14em]',
                        CATEGORY_TONE[event.category] ?? CATEGORY_TONE.liturgy,
                      )}
                    >
                      {t(CATEGORY_LABEL[event.category] ?? { en: event.category, ml: event.category })}
                    </span>
                    <span className="flex items-center gap-1.5 font-sans text-2xs text-[rgb(var(--muted))]">
                      <Icon name="clock" className="h-3.5 w-3.5 text-gold-500/80" />
                      {t(event.time)}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-lg leading-snug text-[rgb(var(--ink))]">
                    {t(event.title)}
                  </h3>

                  <p className="mt-2 line-clamp-2 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                    {t(event.description)}
                  </p>

                  <p className="mt-3 flex items-center gap-1.5 font-sans text-2xs text-[rgb(var(--muted))]">
                    <Icon name="mapPin" className="h-3.5 w-3.5 text-gold-500/80" />
                    {t(event.place)}
                  </p>
                </div>
              </motion.article>
            ))}
          </StaggerGroup>
        </div>

        <p className="mt-10 text-center font-sans text-2xs text-[rgb(var(--muted))]">
          <span className="tabular-nums">{formatNumber(events.length, lang)}</span>{' '}
          {t({ en: 'events in the parish calendar', ml: 'ഇടവക കലണ്ടറിലെ പരിപാടികൾ' })}
        </p>
      </div>
    </section>
  )
}

/** The next event, given the width it deserves. */
function FeatureCard({ event }: { event: UpcomingEvent }) {
  const { t, lang } = useLang()

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className="card group relative overflow-hidden"
    >
      <div className="relative">
        <SmartImage
          src={event.image}
          alt=""
          width={1200}
          height={800}
          sizes="(max-width: 1024px) 92vw, 45vw"
          wrapperClassName="aspect-[4/3] w-full sm:aspect-[16/10]"
          className="h-full w-full object-cover"
          zoom
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/45 to-transparent"
          aria-hidden="true"
        />

        <span className="absolute left-5 top-5 rounded-full border border-gold-300/60 bg-navy-950/60 px-4 py-1.5 font-sans text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-gold-200 backdrop-blur">
          {t({ en: 'Next in the parish', ml: 'ഇടവകയിൽ അടുത്തത്' })}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="font-sans text-2xs uppercase tracking-[0.2em] text-gold-300">
            {formatDate(event.date, lang)} · {t(event.time)}
          </p>
          <h3 className="mt-2 font-display text-2xl leading-snug text-white sm:text-3xl">
            {t(event.title)}
          </h3>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        <p className="font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
          {t(event.description)}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[rgb(var(--line))] pt-5">
          <span className="flex items-center gap-2 font-sans text-2xs text-[rgb(var(--muted))]">
            <Icon name="mapPin" className="h-3.5 w-3.5 text-gold-500" />
            {t(event.place)}
          </span>

          {event.cta ? (
            <a
              href={event.cta.href}
              className="flex items-center gap-2 font-sans text-2xs font-semibold uppercase tracking-[0.16em] text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
            >
              {t(event.cta.label)}
              <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </motion.article>
  )
}

/** The torn-off calendar leaf beside each row. */
function DateBlock({ date }: { date: string }) {
  const { lang } = useLang()
  const day = formatDate(date, lang, { day: 'numeric', month: undefined, year: undefined })
  const month = formatDate(date, lang, { month: 'short', day: undefined, year: undefined })

  return (
    <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-sm border border-gold-400/30 bg-gold-400/[0.06]">
      <span className="font-display text-xl leading-none tabular-nums text-gold-600 dark:text-gold-300">
        {day}
      </span>
      <span className="mt-1 font-sans text-[0.55rem] uppercase tracking-[0.12em] text-[rgb(var(--muted))]">
        {month}
      </span>
    </div>
  )
}
