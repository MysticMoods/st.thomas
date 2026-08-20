'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * The parish emblem, drawn here rather than imported as an asset so it scales
 * cleanly on every display and inherits the current text colour.
 *
 * A lamp above an open Gospel, crossed by the Apostle's spear, inside a ring
 * of pepper vine — the martyrdom, the Word, and the Malabar coast he walked.
 */
export function ParishEmblem({
  className,
  variant = 'line',
}: {
  className?: string
  variant?: 'line' | 'gold'
}) {
  const gradientId = `emblem-gold-${useId().replace(/:/g, '')}`
  const stroke = variant === 'gold' ? `url(#${gradientId})` : 'currentColor'

  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label="Parish emblem of St. Thomas Church, Mangalassery"
      className={cn('h-12 w-12', className)}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8D49F" />
          <stop offset="45%" stopColor="#C9A227" />
          <stop offset="100%" stopColor="#8E6F18" />
        </linearGradient>
      </defs>

      <g stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* outer ring */}
        <circle cx="60" cy="60" r="55" opacity="0.55" />
        <circle cx="60" cy="60" r="50.5" />

        {/* pepper vine — twelve berries for the twelve apostles */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
          // Rounded, because the last digit of an unrounded float can differ
          // between the server render and the browser, which React reports as a
          // hydration mismatch.
          const round = (value: number) => Math.round(value * 1000) / 1000
          const x = round(60 + Math.cos(angle) * 52.7)
          const y = round(60 + Math.sin(angle) * 52.7)
          return <circle key={i} cx={x} cy={y} r="1.7" fill={stroke} stroke="none" />
        })}

        {/* lamp */}
        <path d="M60 20.5c3.6 3.4 5.2 5.9 5.2 8.3a5.2 5.2 0 0 1-10.4 0c0-2.4 1.6-4.9 5.2-8.3Z" />
        <path d="M53 41.5h14l-2.4 5.5h-9.2Z" />
        <path d="M60 37v4.5" opacity="0.7" />

        {/* open gospel */}
        <path d="M28 62.5c9-4.2 18-4.2 27 0v24c-9-4.2-18-4.2-27 0Z" />
        <path d="M92 62.5c-9-4.2-18-4.2-27 0v24c9-4.2 18-4.2 27 0Z" />
        <path d="M60 62.5v24" />
        <path d="M35 70.5c4.4-1.6 8.8-1.9 13.2-1M35 77.5c4.4-1.6 8.8-1.9 13.2-1" opacity="0.6" />
        <path d="M85 70.5c-4.4-1.6-8.8-1.9-13.2-1M85 77.5c-4.4-1.6-8.8-1.9-13.2-1" opacity="0.6" />

        {/* apostle's spear, laid across the book */}
        <path d="M31 96 89 52" />
        <path d="m89 52-9.5 1.6 3.4 8Z" fill={stroke} stroke="none" />
        <path d="M31 96h7" opacity="0.7" />
      </g>
    </svg>
  )
}
