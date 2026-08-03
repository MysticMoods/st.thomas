'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { useEffect, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'

import { Icon } from './Icon'

/** Hairline gold progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const width = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 })

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX: width }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500"
    />
  )
}

export function BackToTop() {
  const { t } = useLang()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t(ui.common.backToTop)}
      className={`no-print fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full border border-gold-400/40 bg-[rgb(var(--card))]/90 text-gold-500 shadow-sacred backdrop-blur transition-all duration-500 ease-sacred hover:border-gold-400 hover:text-gold-400 dark:text-gold-300 ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
    >
      <Icon name="arrowUp" className="h-5 w-5" />
    </button>
  )
}
