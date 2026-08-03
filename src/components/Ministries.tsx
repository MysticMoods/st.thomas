'use client'

import { motion } from 'framer-motion'

import { useLang } from '@/lib/i18n'
import type { MinistriesContent } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'

export function Ministries({ ministries }: { ministries: MinistriesContent }) {
  const { t, lang } = useLang()

  return (
    <section id="ministries" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Get Involved', ml: 'പങ്കാളികളാകുക' }}
          title={ministries.title}
          subtitle={ministries.subtitle}
        />

        <StaggerGroup className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ministries.items.map((item) => (
            <motion.article
              key={item.id}
              variants={staggerItem}
              className="card card-hover group flex flex-col gap-4 p-7"
            >
              <span className="grid h-12 w-12 place-items-center rounded-sm border border-gold-400/30 bg-gold-400/[0.07] text-gold-600 transition-all duration-500 ease-sacred group-hover:border-gold-400/70 group-hover:bg-gold-400/15 dark:text-gold-300">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>

              <h3 className="font-display text-xl leading-snug text-[rgb(var(--ink))]">
                {t(item.name)}
              </h3>

              <p className="flex-1 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                {t(item.description)}
              </p>

              <footer className="mt-2 flex items-center justify-between border-t border-[rgb(var(--line))] pt-4">
                <span className="font-sans text-2xs text-[rgb(var(--muted))]">{t(item.lead)}</span>
                <span className="flex items-center gap-1.5 font-sans text-2xs font-semibold tabular-nums text-gold-600 dark:text-gold-400">
                  <Icon name="users" className="h-3.5 w-3.5" />
                  {formatNumber(item.members, lang)}
                </span>
              </footer>
            </motion.article>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
