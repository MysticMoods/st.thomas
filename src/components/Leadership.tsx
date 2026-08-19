'use client'

import { motion } from 'framer-motion'

import { useLang } from '@/lib/i18n'
import type { LeadershipContent } from '@/lib/types'

import { ParishEmblem } from './ui/ParishEmblem'
import { StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

/** Initials, for a portrait the parish has not uploaded yet. */
function initials(name: string) {
  return name
    .replace(/^(Pope|Mar|Rev\.?|Fr\.?|His|Cardinal)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
}

export function Leadership({ leadership }: { leadership: LeadershipContent }) {
  const { t } = useLang()

  if (leadership.people.length === 0) return null

  return (
    <section id="leadership" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'In Communion', ml: 'കൂട്ടായ്മയിൽ' }}
          title={leadership.title}
          subtitle={leadership.subtitle}
        />

        <StaggerGroup className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {leadership.people.map((person) => (
            <motion.article key={person.id} variants={staggerItem} className="card card-hover group flex flex-col">
              {person.image ? (
                <SmartImage
                  src={person.image}
                  alt={t(person.name)}
                  width={900}
                  height={1125}
                  zoom
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
                  wrapperClassName="aspect-[4/5] w-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                // No photograph yet — a plain plate rather than a stranger's face.
                <div className="relative grid aspect-[4/5] w-full place-items-center bg-gradient-to-b from-navy-900 to-navy-950">
                  <span className="font-display text-6xl text-gold-400/45">
                    {initials(person.name.en)}
                  </span>
                  <ParishEmblem
                    variant="gold"
                    className="absolute bottom-6 h-9 w-9 opacity-45"
                  />
                </div>
              )}

              <div className="flex flex-1 flex-col gap-2 p-7">
                <span className="eyebrow">{t(person.role)}</span>
                <h3 className="font-display text-2xl leading-tight text-[rgb(var(--ink))]">
                  {t(person.name)}
                </h3>
                <span className="gold-rule w-12 opacity-70" aria-hidden="true" />
                <p className="font-sans text-2xs uppercase tracking-[0.14em] text-gold-600 dark:text-gold-400">
                  {t(person.see)}
                </p>
                <p className="mt-1 font-sans text-[0.92rem] leading-relaxed text-[rgb(var(--muted))]">
                  {t(person.note)}
                </p>
                {person.since ? (
                  <p className="mt-auto pt-4 font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                    {t({ en: 'Since', ml: 'മുതൽ' })} {person.since}
                  </p>
                ) : null}
              </div>
            </motion.article>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
