'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { telHref } from '@/lib/utils'

import { Icon } from '../ui/Icon'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * The opening of the hall page. It borrows the shape of the parish hero — one
 * photograph, one line, a rule — so the sub-site reads as part of the same
 * church, and adds the strip of facilities a venue page is expected to carry.
 */
export function HallHero({ hall }: { hall: HallContent }) {
  const { t } = useLang()
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const images = hall.hero.images.length ? hall.hero.images : [hall.image]

  useEffect(() => {
    if (images.length < 2 || reduce) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 7000)
    return () => clearInterval(timer)
  }, [images.length, reduce])

  return (
    <section id="top" className="relative flex min-h-[78svh] flex-col justify-end overflow-hidden bg-navy-950">
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <Image
            src={images[index]}
            alt=""
            fill
            priority={index === 0}
            quality={85}
            sizes="100vw"
            className="pointer-events-none object-cover object-center"
          />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-sacred-veil" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(7,14,26,0.94)_0%,rgba(7,14,26,0.55)_45%,rgba(7,14,26,0.35)_100%)]"
        aria-hidden="true"
      />
      <div className="pointer-events-none grain absolute inset-0" aria-hidden="true" />

      <div className="container relative z-10 pb-16 pt-36 sm:pb-20 sm:pt-40">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.9, ease: EASE }}
          className="block font-sans text-2xs uppercase tracking-sacred text-gold-200/90 sm:text-xs"
        >
          {t(hall.hero.eyebrow)}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42, duration: 1.1, ease: EASE }}
          className="mt-6 max-w-4xl font-display text-[2.4rem] font-normal leading-[1.06] tracking-tight text-white text-shadow-sacred sm:text-5xl lg:text-6xl"
        >
          {t(hall.title)}
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.7, duration: 1, ease: EASE }}
          className="mt-7 h-px w-32 origin-left bg-gold-line sm:w-44"
          aria-hidden="true"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1, ease: EASE }}
          className="mt-7 max-w-2xl font-serif text-lg leading-relaxed text-stone-100/90 text-shadow-sacred sm:text-xl"
        >
          {t(hall.subtitle)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 1, ease: EASE }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <a href="#book" className="btn-primary">
            {t({ en: 'Find a free day', ml: 'ഒഴിവുള്ള ദിവസം കാണുക' })}
            <Icon name="arrowRight" className="h-4 w-4" />
          </a>
          <a href={telHref(hall.booking.contact.phone)} className="btn-ghost">
            <Icon name="phone" className="h-4 w-4" />
            {hall.booking.contact.phone}
          </a>
        </motion.div>
      </div>

      {/* the facilities, travelling quietly along the foot of the photograph */}
      <div className="relative z-10 border-y border-white/10 bg-navy-950/70 py-3 backdrop-blur-sm">
        <div className="flex overflow-hidden" aria-hidden="true">
          <div className="flex shrink-0 animate-marquee motion-reduce:animate-none">
            {[0, 1].map((copy) => (
              <ul key={copy} className="flex shrink-0 items-center">
                {hall.hero.marquee.map((item) => (
                  <li
                    key={`${copy}-${item.en}`}
                    className="flex shrink-0 items-center gap-4 whitespace-nowrap px-6 font-sans text-2xs uppercase tracking-[0.2em] text-stone-300/80"
                  >
                    <span className="h-1 w-1 rounded-full bg-gold-400/70" />
                    {t(item)}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        {/* the same list, read once, for anyone not watching it go past */}
        <p className="sr-only">
          {hall.hero.marquee.map((item) => t(item)).join(', ')}
        </p>
      </div>
    </section>
  )
}
