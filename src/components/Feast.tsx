'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { useLang } from '@/lib/i18n'
import type { FeastContent } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Reveal } from './ui/Reveal'

type Remaining = { days: number; hours: number; minutes: number; seconds: number } | null

function remaining(target: string): Remaining {
  const diff = new Date(target).getTime() - Date.now()
  if (Number.isNaN(diff) || diff <= 0) return null
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

export function Feast({ feast }: { feast: FeastContent }) {
  const { t, lang } = useLang()
  // Starts null so the server and first client render match, then ticks.
  const [time, setTime] = useState<Remaining>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    setTime(remaining(feast.date))
    setStarted(true)
    const timer = setInterval(() => setTime(remaining(feast.date)), 1000)
    return () => clearInterval(timer)
  }, [feast.date])

  const units = time
    ? ([
        ['days', time.days],
        ['hours', time.hours],
        ['minutes', time.minutes],
        ['seconds', time.seconds],
      ] as const)
    : []

  return (
    <section id="feast" className="relative overflow-hidden">
      <Image
        src={feast.image}
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-navy-950/96 via-navy-950/88 to-burgundy-900/80"
        aria-hidden="true"
      />
      <div className="grain absolute inset-0" aria-hidden="true" />

      <div className="container relative grid gap-14 py-24 md:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-20">
        <Reveal>
          <div>
            <span className="eyebrow text-gold-300">{t(feast.eyebrow)}</span>
            <h2 className="mt-5 font-display text-4xl leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              {t(feast.name)}
            </h2>
            <p className="mt-4 font-serif text-2xl italic text-gold-200/90">
              {t(feast.localName)}
            </p>
            <span className="mt-7 block h-px w-28 bg-gold-line" aria-hidden="true" />

            <p className="mt-7 flex items-center gap-2.5 font-sans text-sm uppercase tracking-[0.2em] text-stone-200/85">
              <Icon name="calendar" className="h-4 w-4 text-gold-300" />
              {t(feast.displayDate)}
            </p>

            <p className="mt-7 max-w-xl font-sans text-[0.98rem] leading-[1.85] text-stone-300/85">
              {t(feast.description)}
            </p>

            <a href={feast.cta.href} className="btn-primary mt-9">
              {t(feast.cta.label)}
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.12}>
          <div className="flex flex-col gap-8">
            {/* countdown */}
            <div className="rounded-sm border border-gold-400/25 bg-white/[0.04] p-7 backdrop-blur-sm sm:p-9">
              {!started ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-20 rounded-sm bg-white/10" />
                  ))}
                </div>
              ) : time ? (
                <div className="grid grid-cols-4 gap-2 sm:gap-4">
                  {units.map(([key, value]) => (
                    <div key={key} className="flex flex-col items-center gap-2">
                      <motion.span
                        key={`${key}-${value}`}
                        initial={{ opacity: 0.35, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="font-display text-3xl tabular-nums text-gold-200 sm:text-5xl"
                      >
                        {formatNumber(value, lang)}
                      </motion.span>
                      <span className="text-center font-sans text-[0.58rem] uppercase tracking-[0.16em] text-stone-300/70 sm:text-2xs">
                        {t(feast.countdownLabels[key])}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center font-serif text-xl italic text-gold-200">
                  {t(feast.countdownLabels.arrived)}
                </p>
              )}
            </div>

            {/* feast programme */}
            <ol className="flex flex-col divide-y divide-white/10 rounded-sm border border-white/10 bg-white/[0.03] px-6 backdrop-blur-sm">
              {feast.schedule.map((row) => (
                <li key={t(row.item)} className="flex flex-col gap-1 py-4">
                  <span className="font-sans text-2xs uppercase tracking-[0.16em] text-gold-300">
                    {t(row.time)}
                  </span>
                  <span className="font-serif text-lg text-stone-100">{t(row.item)}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
