'use client'

import { motion } from 'framer-motion'

import { useLang } from '@/lib/i18n'
import type { MassContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

const ACCENT: Record<string, { ring: string; text: string; glow: string }> = {
  gold: {
    ring: 'group-hover:border-gold-400/70',
    text: 'text-gold-500 dark:text-gold-300',
    glow: 'from-gold-400/25',
  },
  navy: {
    ring: 'group-hover:border-navy-400/60',
    text: 'text-navy-500 dark:text-navy-200',
    glow: 'from-navy-400/25',
  },
  burgundy: {
    ring: 'group-hover:border-burgundy-400/60',
    text: 'text-burgundy-500 dark:text-burgundy-300',
    glow: 'from-burgundy-400/25',
  },
  stone: {
    ring: 'group-hover:border-stone-400/70',
    text: 'text-stone-600 dark:text-stone-300',
    glow: 'from-stone-400/25',
  },
}

export function MassTimings({ mass }: { mass: MassContent }) {
  const { t } = useLang()

  return (
    <section
      id="mass-timings"
      className="section relative overflow-hidden bg-[rgb(var(--page-alt))]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gold-line opacity-60"
        aria-hidden="true"
      />

      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Liturgy', ml: 'ആരാധനക്രമം' }}
          title={{ en: 'Mass Timings', ml: 'കുർബാന സമയം' }}
          subtitle={mass.note}
        />

        <StaggerGroup className="mt-20 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {mass.groups.map((group) => {
            const accent = ACCENT[group.accent] ?? ACCENT.gold
            return (
              <motion.article
                key={group.id}
                variants={staggerItem}
                className={cn('card card-hover group flex flex-col', accent.ring)}
              >
                <div className="relative">
                  <SmartImage
                    src={group.image}
                    alt=""
                    width={1200}
                    height={800}
                    zoom
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    wrapperClassName="aspect-[16/8] w-full"
                    className="h-full w-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/25 to-transparent"
                    aria-hidden="true"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-6">
                    <span
                      className={cn(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-gold-300/40 bg-white/10 backdrop-blur-sm',
                        'text-gold-200',
                      )}
                    >
                      <Icon name={group.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-display text-2xl leading-tight text-white">
                        {t(group.title)}
                      </h3>
                      <p className="font-sans text-2xs uppercase tracking-[0.2em] text-gold-200/85">
                        {t(group.subtitle)}
                      </p>
                    </div>
                  </div>
                </div>

                <ul className="flex flex-1 flex-col divide-y divide-[rgb(var(--line))] px-6 sm:px-7">
                  {group.entries.map((entry) => (
                    <li key={`${entry.time}-${t(entry.label)}`} className="flex gap-5 py-5">
                      <span
                        className={cn(
                          'w-24 shrink-0 font-sans text-sm font-semibold tabular-nums tracking-tight',
                          accent.text,
                        )}
                      >
                        {entry.time}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-serif text-lg leading-snug text-[rgb(var(--ink))]">
                          {t(entry.label)}
                        </span>
                        <span className="mt-0.5 block font-sans text-xs text-[rgb(var(--muted))]">
                          {t(entry.note)}
                        </span>
                      </span>
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
