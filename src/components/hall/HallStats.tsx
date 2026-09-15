'use client'

import { motion } from 'framer-motion'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'

import { Counter } from '../ui/Counter'
import { StaggerGroup, staggerItem } from '../ui/Reveal'

/** Four figures, straight under the hero, the way a venue page opens. */
export function HallStats({ hall }: { hall: HallContent }) {
  const { t } = useLang()

  return (
    <section className="border-b border-[rgb(var(--line))] bg-[rgb(var(--page-alt))] py-12 md:py-16">
      <div className="container">
        <StaggerGroup className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
          {hall.stats.map((item) => (
            <motion.div
              key={item.id}
              variants={staggerItem}
              className="flex flex-col items-center gap-3 px-3 text-center"
            >
              <span className="font-display text-4xl tabular-nums text-gold-600 dark:text-gold-300 sm:text-5xl">
                <Counter value={item.value} suffix={item.suffix} />
              </span>
              <span className="h-px w-8 bg-gold-400/50" aria-hidden="true" />
              <span className="font-sans text-2xs uppercase leading-relaxed tracking-[0.16em] text-[rgb(var(--muted))]">
                {t(item.label)}
              </span>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
