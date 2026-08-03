'use client'

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { SiteContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Icon } from './ui/Icon'

const EASE = [0.16, 1, 0.3, 1] as const

export function Hero({ site }: { site: SiteContent }) {
  const { t } = useLang()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const [index, setIndex] = useState(0)
  const images = site.hero.images.length ? site.hero.images : ['/images/site/hero-nave.jpg']

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '38%'])
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  useEffect(() => {
    if (images.length < 2 || reduce) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 7500)
    return () => clearInterval(timer)
  }, [images.length, reduce])

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-navy-950"
    >
      {/* photograph layer — parallaxed and slowly zoomed */}
      <motion.div style={reduce ? undefined : { y, scale }} className="absolute inset-0">
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <Image
              src={images[index]}
              alt=""
              fill
              priority={index === 0}
              quality={88}
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* veils: keeps text at AAA contrast over any photograph */}
      <div className="absolute inset-0 bg-sacred-veil" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(7,14,26,0.72)_100%)]"
        aria-hidden="true"
      />
      <div className="grain absolute inset-0" aria-hidden="true" />

      <motion.div
        style={reduce ? undefined : { y: contentY, opacity: fade }}
        className="container relative z-10 flex flex-col items-center pb-24 pt-32 text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 1, ease: EASE }}
          className="font-sans text-2xs uppercase tracking-sacred text-gold-200/90 sm:text-xs"
        >
          {t(site.hero.eyebrow)}
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.2, ease: EASE }}
          className="mt-7 font-display text-[2.6rem] font-normal leading-[1.04] tracking-tight text-white text-shadow-sacred sm:text-6xl lg:text-7xl xl:text-8xl"
        >
          {t(site.parish.name)}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72, duration: 1, ease: EASE }}
          className="mt-5 font-sans text-sm uppercase tracking-[0.5em] text-gold-200/85 sm:text-base"
        >
          {t(site.parish.place)}
        </motion.p>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.9, duration: 1.2, ease: EASE }}
          className="mt-9 h-px w-40 bg-gold-line sm:w-56"
          aria-hidden="true"
        />

        <motion.blockquote
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 1.1, ease: EASE }}
          className="mt-9 max-w-2xl"
        >
          <p className="font-serif text-2xl italic leading-relaxed text-stone-100/95 text-shadow-sacred sm:text-3xl">
            “{t(site.hero.verse)}”
          </p>
          <cite className="mt-4 block font-sans text-2xs uppercase not-italic tracking-[0.3em] text-gold-200/80 sm:text-xs">
            {t(site.hero.verseRef)}
          </cite>
        </motion.blockquote>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 1.1, ease: EASE }}
          className="mt-8 max-w-2xl font-sans text-[0.98rem] leading-relaxed text-stone-200/85 sm:text-lg"
        >
          {t(site.hero.welcome)}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.45, duration: 1, ease: EASE }}
          className="mt-11 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4"
        >
          {site.hero.actions.map((action) => (
            <a
              key={action.href}
              href={action.href}
              className={action.variant === 'primary' ? 'btn-primary' : 'btn-ghost'}
            >
              {t(action.label)}
              {action.variant === 'primary' ? <Icon name="arrowRight" className="h-4 w-4" /> : null}
            </a>
          ))}
        </motion.div>
      </motion.div>

      {/* slide indicators */}
      {images.length > 1 ? (
        <div className="absolute bottom-10 right-10 z-10 hidden gap-2.5 sm:flex sm:flex-col">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                'w-1.5 rounded-full transition-all duration-700',
                i === index ? 'h-8 bg-gold-300' : 'h-1.5 bg-white/40 hover:bg-white/70',
              )}
            />
          ))}
        </div>
      ) : null}

      <motion.a
        href="#about"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-white/70 transition-colors hover:text-gold-200"
        aria-label={t(ui.common.scroll)}
      >
        <span className="font-sans text-[0.6rem] uppercase tracking-[0.35em]">
          {t(ui.common.scroll)}
        </span>
        <motion.span
          animate={reduce ? undefined : { y: [0, 7, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon name="chevronDown" className="h-4 w-4" />
        </motion.span>
      </motion.a>
    </section>
  )
}
