'use client'

import { animate, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { useLang } from '@/lib/i18n'
import { formatNumber } from '@/lib/utils'

/** Counts from zero to `value` the first time it scrolls into view. */
export function Counter({
  value,
  suffix = '',
  duration = 2.1,
  className,
}: {
  value: number
  suffix?: string
  duration?: number
  className?: string
}) {
  const { lang } = useLang()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-15% 0px' })
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    })
    return () => controls.stop()
  }, [inView, value, duration, reduce])

  return (
    <span ref={ref} className={className}>
      {formatNumber(display, lang)}
      {suffix}
    </span>
  )
}
