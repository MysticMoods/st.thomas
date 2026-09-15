'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const EASE = [0.16, 1, 0.3, 1] as const

function offset(direction: Direction, distance: number) {
  switch (direction) {
    case 'up':
      return { y: distance }
    case 'down':
      return { y: -distance }
    case 'left':
      return { x: distance }
    case 'right':
      return { x: -distance }
    default:
      return {}
  }
}

/**
 * Scroll reveal used by every section. Falls back to a plain element when the
 * visitor prefers reduced motion.
 */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  distance = 26,
  duration = 0.9,
  once = true,
  className,
  as = 'div',
}: {
  children: React.ReactNode
  direction?: Direction
  delay?: number
  distance?: number
  duration?: number
  once?: boolean
  className?: string
  as?: 'div' | 'section' | 'li' | 'article' | 'span' | 'h2' | 'p'
}) {
  const reduce = useReducedMotion()
  const Component = motion[as] as typeof motion.div

  // Reveal is nearly always a grid or flex child. Without min-width:0 such a
  // child is sized by its min-content, so one long unbreakable word (common in
  // Malayalam) pushes the whole column past its track and off the screen.
  const classes = className ? `min-w-0 ${className}` : 'min-w-0'

  if (reduce) {
    const Plain = as as React.ElementType
    return <Plain className={classes}>{children}</Plain>
  }

  return (
    <Component
      className={classes}
      initial={{ opacity: 0, ...offset(direction, distance) }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '-12% 0px -10% 0px' }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </Component>
  )
}

/** Staggers direct children — used for card grids. */
export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
}

export function StaggerGroup({
  children,
  className,
  amount = 0.15,
}: {
  children: React.ReactNode
  className?: string
  amount?: number
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  )
}
