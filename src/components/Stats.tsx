'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

import { useLang } from '@/lib/i18n'
import type { StatsContent } from '@/lib/types'

import { Counter } from './ui/Counter'
import { StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'

export function Stats({ stats }: { stats: StatsContent }) {
  const { t } = useLang()

  return (
    <section className="relative overflow-hidden py-28 md:py-36">
      <Image
        src={stats.image}
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-navy-950/88" aria-hidden="true" />
      <div className="grain absolute inset-0" aria-hidden="true" />

      <div className="container relative">
        <SectionHeading
          eyebrow={{ en: 'Our Community', ml: 'ഞങ്ങളുടെ സമൂഹം' }}
          title={stats.title}
          subtitle={stats.subtitle}
          tone="invert"
        />

        <StaggerGroup className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10 lg:grid-cols-4">
          {stats.items.map((item) => (
            <motion.div
              key={item.id}
              variants={staggerItem}
              className="group flex flex-col items-center gap-3 bg-navy-950/70 px-5 py-10 text-center backdrop-blur-sm transition-colors duration-500 hover:bg-navy-900/70 sm:px-8 sm:py-14"
            >
              <span className="font-display text-4xl tabular-nums text-gold-300 transition-transform duration-500 ease-sacred group-hover:scale-[1.06] sm:text-5xl lg:text-6xl">
                <Counter value={item.value} suffix={item.suffix} />
              </span>
              <span className="h-px w-8 bg-gold-400/50" aria-hidden="true" />
              <span className="font-sans text-2xs uppercase leading-relaxed tracking-[0.18em] text-stone-300/80 sm:text-xs">
                {t(item.label)}
              </span>
            </motion.div>
          ))}
        </StaggerGroup>
      </div>
    </section>
  )
}
