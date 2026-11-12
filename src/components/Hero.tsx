'use client'

import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { SiteContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Icon } from './ui/Icon'

const EASE = [0.16, 1, 0.3, 1] as const

function HeroSlide({
  src,
  isMobile,
  onFinished,
}: {
  src: string
  isMobile: boolean
  onFinished: () => void
}) {
  const isVideo = /\.mp4(\?.*)?$/i.test(src.trim()) || src.toLowerCase().includes('.mp4')
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (!isVideo) return
    const el = videoRef.current
    if (!el) return

    hasStartedRef.current = false
    el.currentTime = 0
    el.muted = true

    const handleTimeUpdate = () => {
      if (el.currentTime > 1) {
        hasStartedRef.current = true
      }
    }

    const handleEnded = () => {
      if (hasStartedRef.current && el.currentTime > 5) {
        onFinished()
      }
    }

    el.addEventListener('timeupdate', handleTimeUpdate)
    el.addEventListener('ended', handleEnded)

    const p = el.play()
    if (p !== undefined) {
      p.catch(() => {})
    }

    return () => {
      el.removeEventListener('timeupdate', handleTimeUpdate)
      el.removeEventListener('ended', handleEnded)
    }
  }, [isVideo, src, onFinished])

  if (isVideo) {
    const cleanSrc = src.trim()
    const small = cleanSrc.replace(/\.mp4$/i, '-sm.mp4')
    return (
      <video
        ref={videoRef}
        src={isMobile ? small : cleanSrc}
        autoPlay
        muted
        playsInline
        preload="auto"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
        aria-hidden="true"
      />
    )
  }

  if (/\.mp4/i.test(src)) {
    return null
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      priority={false}
      quality={88}
      sizes="100vw"
      className="pointer-events-none object-cover object-center select-none"
    />
  )
}

export function Hero({ site }: { site: SiteContent }) {
  const { t } = useLang()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const images = site.hero.images.length ? site.hero.images : ['/images/site/hero-nave.jpg']
  // A slide may be a short silent film instead of a photograph: an .mp4 in the
  // list takes its turn like any picture, and moves on when it has played.
  // Beside it the site looks for a lighter cut for phones (-sm.mp4).
  const slides = images.map((src) =>
    /\.mp4$/i.test(src)
      ? { kind: 'film' as const, src, small: src.replace(/\.mp4$/i, '-sm.mp4') }
      : { kind: 'photo' as const, src },
  )
  const index = step % slides.length
  const slide = slides[index]
  const next = () => setStep((s) => s + 1)

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '38%'])
  const fade = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  useEffect(() => {
    // A film moves itself on when it ends; photographs stay 7.5 seconds each.
    // For films, a safety timer prevents freezing if autoplay or onEnded fails.
    if (slides.length < 2) return
    const duration = slide.kind === 'film' ? 20000 : 7500
    const timer = setTimeout(next, duration)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, slides.length, slide.kind])

  return (
    <section
      id="top"
      ref={ref}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-navy-950 select-none"
    >
      {/* photograph layer — parallaxed and slowly zoomed */}
      <motion.div style={reduce ? undefined : { y, scale }} className="pointer-events-none absolute inset-0 select-none">
        <AnimatePresence initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0"
          >
            <HeroSlide
              src={slide.src}
              isMobile={isMobile}
              onFinished={next}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* veils: keeps text at AAA contrast over any photograph */}
      <div className="pointer-events-none absolute inset-0 bg-sacred-veil" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_15%,rgba(7,14,26,0.72)_100%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-navy-950/25 sm:hidden"
        aria-hidden="true"
      />
      <div className="pointer-events-none grain absolute inset-0" aria-hidden="true" />

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
          <cite className="mt-4 block font-sans text-2xs uppercase not-italic tracking-[0.3em] text-gold-200/90 text-shadow-sacred sm:text-xs">
            {t(site.hero.verseRef)}
          </cite>
        </motion.blockquote>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 1.1, ease: EASE }}
          className="mt-8 max-w-2xl font-sans text-[0.98rem] leading-relaxed text-stone-100/95 text-shadow-sacred sm:text-lg"
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
              onClick={() => {
                setStep((s) => s + ((i - (s % slides.length) + slides.length) % slides.length))
              }}
              aria-label={`View ${/\.mp4$/i.test(src) ? 'video' : 'image'} ${i + 1}`}
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
