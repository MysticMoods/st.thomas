'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { EventsContent } from '@/lib/types'
import { cn, todayKey } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'

const TAG_STYLES: Record<string, string> = {
  liturgy: 'bg-gold-400/15 text-gold-700 dark:text-gold-300',
  prayer: 'bg-navy-500/12 text-navy-600 dark:text-navy-200',
  community: 'bg-stone-500/15 text-stone-700 dark:text-stone-300',
  formation: 'bg-burgundy-500/12 text-burgundy-600 dark:text-burgundy-300',
  music: 'bg-gold-500/12 text-gold-700 dark:text-gold-300',
  youth: 'bg-burgundy-400/15 text-burgundy-600 dark:text-burgundy-300',
  sacrament: 'bg-navy-400/12 text-navy-600 dark:text-navy-200',
  service: 'bg-stone-400/18 text-stone-700 dark:text-stone-300',
}

export function WeeklyCalendar({ events }: { events: EventsContent }) {
  const { t } = useLang()
  // Resolved after mount so server and client markup always agree.
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => setToday(todayKey()), [])

  return (
    <section id="weekly-events" className="section relative bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Parish Calendar', ml: 'ഇടവക കലണ്ടർ' }}
          title={events.title}
          subtitle={events.subtitle}
        />

        <StaggerGroup className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {events.days.map((day) => {
            const isToday = today === day.key
            return (
              <motion.article
                key={day.key}
                variants={staggerItem}
                className={cn(
                  'relative flex flex-col rounded-sm border p-5 transition-all duration-500 ease-sacred',
                  isToday
                    ? 'border-gold-400/70 bg-gradient-to-b from-navy-900 to-navy-950 text-white shadow-lift'
                    : 'border-[rgb(var(--line))] bg-[rgb(var(--card))] hover:-translate-y-1 hover:border-gold-300/60 hover:shadow-sacred',
                )}
              >
                {isToday ? (
                  <span className="absolute -top-2.5 left-5 rounded-full bg-gold-400 px-3 py-0.5 font-sans text-[0.6rem] font-bold uppercase tracking-[0.18em] text-navy-950">
                    {t(ui.common.today)}
                  </span>
                ) : null}

                <header className="flex items-baseline justify-between gap-2 border-b border-current/10 pb-4">
                  <h3
                    className={cn(
                      'font-display text-xl',
                      isToday ? 'text-white' : 'text-[rgb(var(--ink))]',
                    )}
                  >
                    {t(day.name)}
                  </h3>
                  <span
                    className={cn(
                      'font-sans text-2xs tabular-nums',
                      isToday ? 'text-gold-300' : 'text-[rgb(var(--muted))]',
                    )}
                  >
                    {day.events.length}
                  </span>
                </header>

                <ul className="mt-4 flex flex-1 flex-col gap-4">
                  {day.events.map((event) => (
                    <li key={`${day.key}-${event.time}-${t(event.title)}`}>
                      <div className="flex items-center gap-2">
                        <Icon
                          name="clock"
                          className={cn(
                            'h-3.5 w-3.5',
                            isToday ? 'text-gold-300' : 'text-gold-500/80',
                          )}
                        />
                        <span
                          className={cn(
                            'font-sans text-2xs font-semibold uppercase tracking-[0.12em] tabular-nums',
                            isToday ? 'text-gold-200' : 'text-gold-600 dark:text-gold-400',
                          )}
                        >
                          {event.time}
                        </span>
                      </div>
                      <p
                        className={cn(
                          'mt-1 font-serif text-[1.05rem] leading-snug',
                          isToday ? 'text-stone-50' : 'text-[rgb(var(--ink))]',
                        )}
                      >
                        {t(event.title)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'font-sans text-2xs',
                            isToday ? 'text-stone-300/80' : 'text-[rgb(var(--muted))]',
                          )}
                        >
                          {t(event.place)}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-sans text-[0.58rem] uppercase tracking-[0.1em]',
                            isToday
                              ? 'bg-white/10 text-gold-200'
                              : (TAG_STYLES[event.tag] ?? TAG_STYLES.liturgy),
                          )}
                        >
                          {event.tag}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.article>
            )
          })}
        </StaggerGroup>
      </div>
    </section>
  )
}
