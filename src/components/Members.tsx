'use client'

import { motion } from 'framer-motion'

import { ui, useLang } from '@/lib/i18n'
import type { StatsContent } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Reveal, StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'

/**
 * Household records stay in the parish register. This section publishes the
 * summary only, and points people to the office for anything personal.
 */
export function Members({ stats }: { stats: StatsContent }) {
  const { t, lang } = useLang()
  const summary = stats.items.filter((item) =>
    ['families', 'members', 'youth', 'seniors'].includes(item.id),
  )

  return (
    <section id="members" className="section-tight bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Parish Register', ml: 'ഇടവക രജിസ്റ്റർ' }}
          title={ui.members.title}
          subtitle={ui.members.subtitle}
        />

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16">
          <StaggerGroup className="grid grid-cols-2 gap-4">
            {summary.map((item) => (
              <motion.div
                key={item.id}
                variants={staggerItem}
                className="card flex flex-col gap-2 p-7 text-center"
              >
                <span className="font-display text-3xl tabular-nums text-gold-600 dark:text-gold-300 sm:text-4xl">
                  {formatNumber(item.value, lang)}
                </span>
                <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  {t(item.label)}
                </span>
              </motion.div>
            ))}
          </StaggerGroup>

          <Reveal direction="left" delay={0.1}>
            <div className="rounded-sm border border-gold-400/30 bg-gold-400/[0.05] p-8 sm:p-10">
              <span className="grid h-11 w-11 place-items-center rounded-sm border border-gold-400/40 text-gold-600 dark:text-gold-300">
                <Icon name="lock" className="h-5 w-5" />
              </span>
              <h3 className="mt-6 font-display text-2xl text-[rgb(var(--ink))]">
                {t({ en: 'Your details stay with us', ml: 'നിങ്ങളുടെ വിവരങ്ങൾ ഞങ്ങളോടൊപ്പം' })}
              </h3>
              <p className="mt-4 font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
                {t(ui.members.note)}
              </p>
              <a href="#contact" className="btn-outline mt-8">
                {t(ui.contact.heading)}
                <Icon name="arrowRight" className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
