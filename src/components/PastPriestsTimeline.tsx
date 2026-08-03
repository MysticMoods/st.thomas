'use client'

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useRef } from 'react'

import { useLang } from '@/lib/i18n'
import type { PastPriestsContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

const EASE = [0.16, 1, 0.3, 1] as const

export function PastPriestsTimeline({ pastPriests }: { pastPriests: PastPriestsContent }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 78%', 'end 55%'],
  })
  const fill = useSpring(scrollYProgress, { stiffness: 90, damping: 28, restDelta: 0.0008 })
  const glow = useTransform(fill, (v) => `${v * 100}%`)

  return (
    <section id="past-priests" className="section relative overflow-hidden bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'In Memoriam', ml: 'സ്മരണയിൽ' }}
          title={pastPriests.title}
          subtitle={pastPriests.subtitle}
        />

        <div ref={ref} className="relative mx-auto mt-24 max-w-5xl">
          {/* the spine */}
          <div
            className="absolute left-6 top-0 h-full w-px bg-[rgb(var(--line))] lg:left-1/2 lg:-translate-x-1/2"
            aria-hidden="true"
          />
          <motion.div
            style={reduce ? { scaleY: 1 } : { scaleY: fill }}
            className="absolute left-6 top-0 h-full w-px origin-top bg-gradient-to-b from-gold-300 via-gold-400 to-gold-500 lg:left-1/2 lg:-translate-x-1/2"
            aria-hidden="true"
          />
          {!reduce ? (
            <motion.div
              style={{ top: glow }}
              className="absolute left-6 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-300 shadow-[0_0_22px_6px_rgba(201,162,39,0.45)] lg:left-1/2"
              aria-hidden="true"
            />
          ) : null}

          <ol className="flex flex-col gap-14 lg:gap-4">
            {pastPriests.priests.map((priest, i) => (
              <TimelineEntry key={priest.years} priest={priest} index={i} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function TimelineEntry({
  priest,
  index,
}: {
  priest: PastPriestsContent['priests'][number]
  index: number
}) {
  const { t } = useLang()
  const reduce = useReducedMotion()
  const left = index % 2 === 0

  const initial = reduce ? {} : { opacity: 0, y: 34, x: left ? -22 : 22 }

  return (
    <motion.li
      initial={initial}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-10% 0px -12% 0px' }}
      transition={{ duration: 0.95, ease: EASE }}
      className={cn(
        'relative grid gap-6 pl-16 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-8 lg:pl-0',
        left ? '' : 'lg:[direction:rtl]',
      )}
    >
      {/* node */}
      <span
        className="absolute left-6 top-8 z-10 grid h-4 w-4 -translate-x-1/2 place-items-center rounded-full border-2 border-gold-400 bg-[rgb(var(--page))] lg:left-1/2 lg:top-1/2 lg:-translate-y-1/2"
        aria-hidden="true"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
      </span>

      <div className={cn('[direction:ltr]', left ? 'lg:text-right' : '')}>
        <figure
          className={cn(
            'group relative inline-block w-full max-w-[15rem] overflow-hidden rounded-sm border border-[rgb(var(--line))] transition-all duration-500 ease-sacred hover:border-gold-300/70 hover:shadow-lift sm:max-w-[16rem]',
            left ? 'lg:ml-auto' : '',
          )}
        >
          <SmartImage
            src={priest.image}
            alt={t(priest.name)}
            width={900}
            height={1125}
            zoom
            sizes="(max-width: 1024px) 60vw, 16rem"
            wrapperClassName="aspect-[4/5] w-full"
            className="h-full w-full object-cover grayscale transition-[filter,transform] duration-700 ease-sacred group-hover:grayscale-0"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/95 to-transparent px-4 pb-3 pt-10 text-left">
            <span className="font-sans text-2xs font-semibold uppercase tracking-[0.18em] tabular-nums text-gold-300">
              {priest.years}
            </span>
          </figcaption>
        </figure>
      </div>

      <div className={cn('[direction:ltr] lg:pt-2', left ? '' : 'lg:text-right')}>
        <h3 className="font-display text-2xl leading-snug text-[rgb(var(--ink))]">
          {t(priest.name)}
        </h3>
        <p className="mt-2 font-sans text-2xs uppercase tracking-[0.22em] tabular-nums text-gold-600 dark:text-gold-400">
          {priest.years}
        </p>
        <span
          className={cn('mt-5 block h-px w-14 bg-gold-line', left ? '' : 'lg:ml-auto')}
          aria-hidden="true"
        />
        <p className="mt-5 max-w-prose font-sans text-[0.97rem] leading-relaxed text-[rgb(var(--muted))]">
          {t(priest.bio)}
        </p>
      </div>
    </motion.li>
  )
}
