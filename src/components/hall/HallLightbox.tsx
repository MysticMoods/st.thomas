'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect } from 'react'

import { ui, useLang } from '@/lib/i18n'

import { Icon } from '../ui/Icon'

/** Full screen viewer for one hall's photographs. */
export function HallLightbox({
  images,
  index,
  title,
  onIndex,
  onClose,
}: {
  images: string[]
  index: number
  title: string
  onIndex: (next: number) => void
  onClose: () => void
}) {
  const { t } = useLang()
  const open = images.length > 0

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onIndex((index + 1) % images.length)
      if (event.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open, index, images.length, onIndex, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[90] flex flex-col bg-navy-950/96 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <header className="flex items-center justify-between px-5 py-4 sm:px-8">
            <span className="font-sans text-2xs uppercase tracking-[0.22em] text-gold-300">
              {title} · {index + 1} {t(ui.common.of)} {images.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t(ui.common.close)}
              className="grid h-11 w-11 place-items-center rounded-sm border border-white/25 text-white transition-colors hover:border-gold-300 hover:text-gold-200"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </header>

          <div className="relative flex flex-1 items-center justify-center px-4 pb-8 sm:px-16">
            <button
              type="button"
              onClick={() => onIndex((index - 1 + images.length) % images.length)}
              aria-label="Previous"
              className="absolute left-2 z-10 grid h-11 w-11 place-items-center rounded-sm border border-white/25 text-white transition-colors hover:border-gold-300 sm:left-6"
            >
              <Icon name="chevronLeft" className="h-4 w-4" />
            </button>

            <motion.div
              key={images[index]}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative h-full w-full max-w-5xl"
            >
              <Image
                src={images[index]}
                alt={title}
                fill
                sizes="100vw"
                quality={85}
                className="object-contain"
              />
            </motion.div>

            <button
              type="button"
              onClick={() => onIndex((index + 1) % images.length)}
              aria-label="Next"
              className="absolute right-2 z-10 grid h-11 w-11 place-items-center rounded-sm border border-white/25 text-white transition-colors hover:border-gold-300 sm:right-6"
            >
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
