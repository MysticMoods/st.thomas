'use client'

import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { useRef } from 'react'

import { useLang } from '@/lib/i18n'
import type { L } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * A fixed-depth photograph between two sections. The image drifts slower than
 * the page, so the band reads as a window cut through the site onto something
 * standing still behind it — a breath between one section and the next.
 *
 * `strength` is how far the image travels, as a share of the band height.
 */
export function ParallaxBand({
  image,
  verse,
  attribution,
  height = 'md',
  strength = 0.28,
  align = 'center',
}: {
  image: string
  verse?: L
  attribution?: L
  height?: 'sm' | 'md' | 'lg'
  strength?: number
  align?: 'center' | 'left'
}) {
  const { t } = useLang()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const shift = strength * 100
  const y = useTransform(scrollYProgress, [0, 1], [`-${shift}%`, `${shift}%`])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.06, 1.14, 1.06])
  const textY = useTransform(scrollYProgress, [0, 1], ['28%', '-28%'])
  const opacity = useTransform(scrollYProgress, [0, 0.28, 0.72, 1], [0, 1, 1, 0])

  const heights = {
    sm: 'h-[42vh] min-h-[16rem] md:h-[46vh]',
    md: 'h-[58vh] min-h-[20rem] md:h-[62vh]',
    lg: 'h-[76vh] min-h-[24rem]',
  }

  return (
    <section
      ref={ref}
      aria-hidden={!verse}
      className={cn('relative w-full overflow-hidden bg-navy-950', heights[height])}
    >
      {/* Taller than the band so the drift never exposes an edge. */}
      <motion.div
        style={reduce ? undefined : { y, scale }}
        className="absolute inset-x-0 -top-[20%] h-[140%] will-change-transform"
      >
        <Image
          src={image}
          alt=""
          fill
          quality={80}
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-950/75 via-navy-950/45 to-navy-950/80"
        aria-hidden="true"
      />
      <div className="pointer-events-none grain absolute inset-0" aria-hidden="true" />

      {verse ? (
        <motion.div
          style={reduce ? undefined : { y: textY, opacity }}
          className={cn(
            'container relative flex h-full flex-col justify-center',
            align === 'center' ? 'items-center text-center' : 'items-start text-left',
          )}
        >
          <span className="h-px w-16 bg-gold-line" aria-hidden="true" />
          <blockquote className="mt-8 max-w-3xl font-serif text-2xl italic leading-relaxed text-stone-100 text-shadow-sacred sm:text-3xl lg:text-4xl">
            “{t(verse)}”
          </blockquote>
          {attribution ? (
            <cite className="mt-6 font-sans text-2xs uppercase not-italic tracking-[0.3em] text-gold-200/85">
              {t(attribution)}
            </cite>
          ) : null}
          <span className="mt-8 h-px w-16 bg-gold-line" aria-hidden="true" />
        </motion.div>
      ) : null}
    </section>
  )
}
