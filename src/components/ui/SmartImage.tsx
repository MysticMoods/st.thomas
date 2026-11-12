'use client'

import Image, { type ImageProps } from 'next/image'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * next/image with a skeleton placeholder that fades out on load, plus an
 * optional slow zoom on hover. Used for every photograph on the site.
 */
export function SmartImage({
  className,
  wrapperClassName,
  zoom = false,
  rounded = false,
  ...props
}: ImageProps & {
  wrapperClassName?: string
  zoom?: boolean
  /** Set false for a full-bleed photograph that runs to the section edge. */
  rounded?: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (imgRef.current && (imgRef.current.complete || imgRef.current.naturalWidth > 0)) {
      setLoaded(true)
    }
  }, [])

  return (
    <span
      className={cn(
        'relative block overflow-hidden bg-stone-200/60 dark:bg-navy-800/60',
        rounded && 'rounded-sm',
        wrapperClassName,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'skeleton absolute inset-0 transition-opacity duration-700',
          loaded && 'pointer-events-none opacity-0',
        )}
      />
      <Image
        {...props}
        ref={imgRef}
        alt={props.alt}
        onLoad={(e) => {
          setLoaded(true)
          props.onLoad?.(e)
        }}
        className={cn(
          'transition-[transform,opacity] duration-[1200ms] ease-sacred',
          loaded ? 'opacity-100' : 'opacity-0',
          zoom && 'group-hover:scale-[1.06]',
          className,
        )}
      />
    </span>
  )
}
