'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { GalleryContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

const RATIO: Record<string, string> = {
  normal: 'aspect-[4/3]',
  wide: 'aspect-[16/10]',
  tall: 'aspect-[3/4]',
}

export function Gallery({ gallery }: { gallery: GalleryContent }) {
  const { t } = useLang()
  const [category, setCategory] = useState('all')
  const [lightbox, setLightbox] = useState<number | null>(null)

  const items = useMemo(
    () => (category === 'all' ? gallery.items : gallery.items.filter((i) => i.category === category)),
    [category, gallery.items],
  )

  const close = useCallback(() => setLightbox(null), [])
  const step = useCallback(
    (delta: number) =>
      setLightbox((current) =>
        current === null ? null : (current + delta + items.length) % items.length,
      ),
    [items.length],
  )

  useEffect(() => {
    if (lightbox === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [lightbox, close, step])

  const active = lightbox === null ? null : items[lightbox]

  return (
    <section id="gallery" className="section bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Gallery', ml: 'ചിത്രശാല' }}
          title={gallery.title}
          subtitle={gallery.subtitle}
        />

        <div className="no-scrollbar mt-14 flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:justify-center">
          {gallery.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              aria-pressed={category === cat.id}
              className={cn(
                'shrink-0 rounded-sm border px-4 py-2.5 font-sans text-2xs font-medium uppercase tracking-[0.16em] transition-all duration-300',
                category === cat.id
                  ? 'border-gold-400 bg-gold-400 text-navy-950'
                  : 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-300 hover:text-gold-600 dark:hover:text-gold-300',
              )}
            >
              {t(cat.label)}
            </button>
          ))}
        </div>

        <motion.div layout className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
          <AnimatePresence mode="popLayout">
            {items.map((item, i) => (
              <motion.button
                key={item.id}
                layout
                type="button"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => setLightbox(i)}
                className="group mb-5 block w-full break-inside-avoid overflow-hidden rounded-sm border border-[rgb(var(--line))] text-left transition-all duration-500 ease-sacred hover:border-gold-300/70 hover:shadow-lift"
              >
                <span className="relative block">
                  <SmartImage
                    src={item.src}
                    alt={t(item.caption)}
                    width={1200}
                    height={900}
                    zoom
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    wrapperClassName={cn('w-full', RATIO[item.span] ?? RATIO.normal)}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                  <span className="absolute inset-x-0 bottom-0 translate-y-3 p-5 opacity-0 transition-all duration-500 ease-sacred group-hover:translate-y-0 group-hover:opacity-100">
                    <span className="block font-serif text-lg leading-snug text-white">
                      {t(item.caption)}
                    </span>
                  </span>
                  <span className="absolute right-4 top-4 grid h-9 w-9 scale-90 place-items-center rounded-sm border border-white/40 bg-black/25 text-white opacity-0 backdrop-blur-sm transition-all duration-500 group-hover:scale-100 group-hover:opacity-100">
                    <Icon name="plus" className="h-4 w-4" />
                  </span>
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {active ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[90] flex flex-col bg-navy-950/96 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label={t(active.caption)}
          >
            <header className="flex items-center justify-between px-5 py-4 sm:px-8">
              <span className="font-sans text-2xs uppercase tracking-[0.22em] text-gold-300">
                {(lightbox ?? 0) + 1} {t(ui.common.of)} {items.length}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label={t(ui.common.close)}
                className="grid h-11 w-11 place-items-center rounded-sm border border-white/25 text-white transition-colors hover:border-gold-300 hover:text-gold-200"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </header>

            <div className="relative flex flex-1 items-center justify-center px-4 pb-4 sm:px-16">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label={t(ui.common.previous)}
                className="absolute left-2 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/30 text-white transition-colors hover:border-gold-300 hover:text-gold-200 sm:left-5"
              >
                <Icon name="chevronLeft" className="h-5 w-5" />
              </button>

              <motion.figure
                key={active.id}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex h-full max-h-[78vh] w-full max-w-5xl flex-col"
              >
                <span className="relative min-h-0 flex-1">
                  <Image
                    src={active.src}
                    alt={t(active.caption)}
                    fill
                    sizes="90vw"
                    className="object-contain"
                    priority
                  />
                </span>
                <figcaption className="mt-5 text-center font-serif text-lg text-stone-200 sm:text-xl">
                  {t(active.caption)}
                </figcaption>
              </motion.figure>

              <button
                type="button"
                onClick={() => step(1)}
                aria-label={t(ui.common.next)}
                className="absolute right-2 z-10 grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black/30 text-white transition-colors hover:border-gold-300 hover:text-gold-200 sm:right-5"
              >
                <Icon name="chevronRight" className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
