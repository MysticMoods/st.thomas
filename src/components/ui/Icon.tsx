import { cn } from '@/lib/utils'

/**
 * One hand-drawn line-icon set for the whole site, so nothing is imported from
 * a third-party icon font and every glyph shares the same 1.4px stroke weight.
 */
const paths: Record<string, React.ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.5 12h2M19.5 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" />,
  candle: (
    <>
      <path d="M12 3.2c1.6 1.5 2.3 2.6 2.3 3.7a2.3 2.3 0 0 1-4.6 0c0-1.1.7-2.2 2.3-3.7Z" />
      <path d="M9.2 10.5h5.6v10.2H9.2z" />
      <path d="M7 20.7h10" />
    </>
  ),
  cross: <path d="M12 3v18M6.5 8.2h11" />,
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="M10.9 10.9 20 20M17 17l-2 2M14.5 14.5l-2 2" />
    </>
  ),
  monstrance: (
    <>
      <circle cx="12" cy="9" r="3.2" />
      <path d="M12 2.6v1.6M12 13.8v1.6M5.4 9h1.6M17 9h1.6M7.3 4.3l1.2 1.2M15.5 11.5l1.2 1.2M16.7 4.3l-1.2 1.2M8.5 11.5l-1.2 1.2" />
      <path d="M12 15.4v3.2M9 21.4h6" />
    </>
  ),
  dove: (
    <>
      <path d="M3.5 13.5c3.5.6 6-.7 7.6-3.2 1.3-2 3-3.3 5.4-3.5 1.7-.1 3 .6 4 2.2-1.5.4-2.3 1.1-2.6 2.3 1 .3 1.6.9 1.9 1.9-3.6 4.8-7.4 6.6-11.4 5.2" />
      <path d="M8.5 18.4 6.8 21.4" />
      <circle cx="17.6" cy="8.6" r=".5" fill="currentColor" />
    </>
  ),
  flame: (
    <>
      <path d="M12 2.8s5.4 4.2 5.4 9.1a5.4 5.4 0 1 1-10.8 0C6.6 7 12 2.8 12 2.8Z" />
      <path d="M12 20.4a2.6 2.6 0 0 1-2.6-2.6c0-1.9 2.6-4.2 2.6-4.2s2.6 2.3 2.6 4.2a2.6 2.6 0 0 1-2.6 2.6Z" />
    </>
  ),
  book: (
    <>
      <path d="M3.6 4.6h6a2.8 2.8 0 0 1 2.4 1.4 2.8 2.8 0 0 1 2.4-1.4h6v13.2h-6a2.8 2.8 0 0 0-2.4 1.4 2.8 2.8 0 0 0-2.4-1.4h-6z" />
      <path d="M12 6v13.2" />
    </>
  ),
  scroll: (
    <>
      <path d="M6 3.6h11a2 2 0 0 1 2 2v12.8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.6" />
      <path d="M5 6.6a2 2 0 0 1 2-2M9 8.6h7M9 12h7M9 15.4h4" />
    </>
  ),
  music: (
    <>
      <path d="M9 18.2V5.4l10-2v12.4" />
      <circle cx="6.4" cy="18.4" r="2.6" />
      <circle cx="16.4" cy="15.8" r="2.6" />
    </>
  ),
  home: (
    <>
      <path d="M3.6 10.6 12 3.4l8.4 7.2" />
      <path d="M5.6 9.4v11h12.8v-11" />
      <path d="M10 20.4v-5.6h4v5.6" />
    </>
  ),
  rose: (
    <>
      <path d="M12 21c4-1.6 6.4-4.6 6.4-8.4A6.4 6.4 0 0 0 12 6.2a6.4 6.4 0 0 0-6.4 6.4C5.6 16.4 8 19.4 12 21Z" />
      <path d="M12 21V9.4M9.2 12.4c1.4 0 2.8.8 2.8 2.4M14.8 12.4c-1.4 0-2.8.8-2.8 2.4M12 6.2c0-1.8 1.4-3.2 3.2-3.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8 4.6 6v6c0 4.4 3.1 8.2 7.4 9.2 4.3-1 7.4-4.8 7.4-9.2V6Z" />
      <path d="M9.2 12.2 11.3 14.4 15 10.4" />
    </>
  ),
  hands: (
    <>
      <path d="M8.4 20.6V12l-2 2.2a2 2 0 0 1-2.8-2.8l4-4.6V3.6a1.6 1.6 0 0 1 3.2 0v6" />
      <path d="M15.6 20.6V12l2 2.2a2 2 0 0 0 2.8-2.8l-4-4.6V3.6a1.6 1.6 0 0 0-3.2 0v6" />
    </>
  ),
  heart: (
    <path d="M12 20.4S3.6 15.6 3.6 9.8A4.6 4.6 0 0 1 12 7.2a4.6 4.6 0 0 1 8.4 2.6c0 5.8-8.4 10.6-8.4 10.6Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.4V12l3.2 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.6" y="5.2" width="16.8" height="15.2" rx="1.6" />
      <path d="M3.6 9.8h16.8M8.4 3.4v3.4M15.6 3.4v3.4" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21.4s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),
  phone: (
    <path d="M6.2 3.6h3.2l1.6 4-2 1.4a11.4 11.4 0 0 0 5.4 5.4l1.4-2 4 1.6v3.2a1.8 1.8 0 0 1-2 1.8C10.5 18.4 5.6 13.5 4.4 5.6a1.8 1.8 0 0 1 1.8-2Z" />
  ),
  mail: (
    <>
      <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="1.8" />
      <path d="m3.4 6.8 8.6 6 8.6-6" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M3.4 20.6l1.3-4.6A8.3 8.3 0 1 1 8 19.4Z" />
      <path d="M9 8.6c-.4 0-.8.2-1 .6-.4.5-.7 1.2-.4 2.2.4 1.4 1.6 3 3.3 3.9 1.2.6 2 .6 2.6.4.5-.2.9-.7 1.1-1.2l-2-1-.7.8c-.9-.4-1.7-1.2-2.2-2.1l.8-.7Z" />
    </>
  ),
  facebook: (
    <path d="M14.6 21.4v-8.2h2.8l.4-3.2h-3.2V7.9c0-.9.3-1.6 1.6-1.6h1.7V3.4c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H8.4v3.2h2.8v8.2Z" />
  ),
  instagram: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.6" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r=".9" fill="currentColor" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.6" y="5.6" width="18.8" height="12.8" rx="3.6" />
      <path d="m10.4 9.4 4.8 2.6-4.8 2.6z" />
    </>
  ),
  telegram: <path d="M21 4.4 2.9 11.3l4.7 1.6 1.8 5.6 2.6-3.1 4.4 3.2Zm-13.4 8.5 9.6-5.9-7.8 7.2" />,
  x: <path d="M4 4h3.6l4.5 6.1L17.6 4H20l-6.6 7.6L20.4 20h-3.6l-4.8-6.5L6 20H3.6l7-8Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 12h16.8M12 3.4c2.2 2.4 3.4 5.4 3.4 8.6S14.2 18.2 12 20.6c-2.2-2.4-3.4-5.4-3.4-8.6S9.8 5.8 12 3.4Z" />
    </>
  ),
  arrowRight: <path d="M4.4 12h15.2M13.6 6l6 6-6 6" />,
  arrowUp: <path d="M12 19.6V4.4M6 10.4l6-6 6 6" />,
  chevronDown: <path d="m6 9.4 6 6 6-6" />,
  chevronLeft: <path d="m14.6 5.6-6 6.4 6 6.4" />,
  chevronRight: <path d="m9.4 5.6 6 6.4-6 6.4" />,
  play: <path d="M7.4 4.6 19 12 7.4 19.4Z" />,
  close: <path d="M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />,
  menu: <path d="M3.6 7h16.8M3.6 12h16.8M3.6 17h16.8" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  download: <path d="M12 3.6v11.2M7.6 10.6 12 15l4.4-4.4M4.4 19.6h15.2" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="12" rx="2" />
      <path d="M15 5.5A2.5 2.5 0 0 0 12.5 3h-6A2.5 2.5 0 0 0 4 5.5v9A2.5 2.5 0 0 0 6.5 17" />
    </>
  ),
  file: (
    <>
      <path d="M6 2.8h7.4L19 8.4v12.8H6z" />
      <path d="M13.2 2.8v5.8H19" />
    </>
  ),
  quote: (
    <path d="M9.4 5.6C6.5 7 5 9.3 5 12.4h3.2v6H4.6c-1 0-1.6-.6-1.6-1.8v-4.2c0-4 1.9-6.8 5.6-8.4Zm10 0C16.5 7 15 9.3 15 12.4h3.2v6h-3.6c-1 0-1.6-.6-1.6-1.8v-4.2c0-4 1.9-6.8 5.6-8.4Z" />
  ),
  check: <path d="m5 12.6 4.6 4.6L19 7.4" />,
  users: (
    <>
      <circle cx="9" cy="8.2" r="3.4" />
      <path d="M3 20.2c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M17.4 14.6c2.2.5 3.6 2.3 3.6 4.6" />
    </>
  ),
  sparkle: <path d="M12 3.2 13.8 9 19.6 10.8 13.8 12.6 12 18.4 10.2 12.6 4.4 10.8 10.2 9Z" />,
  bell: (
    <>
      <path d="M6.4 9.6a5.6 5.6 0 0 1 11.2 0c0 4.6 1.6 6 1.6 6H4.8s1.6-1.4 1.6-6Z" />
      <path d="M10.2 19a2 2 0 0 0 3.6 0" />
    </>
  ),
  translate: (
    <>
      <path d="M3.4 5.6h8M7.4 3.4v2.2M9.4 5.6c0 3.6-2.4 6.6-6 8" />
      <path d="M4.4 10.2c1.6 2.2 3.6 3.4 6 4.2M12.6 20.6l4-10 4 10M14 17.6h5.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.2" />
      <path d="M15.6 15.6 20 20" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2" />
      <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" />
    </>
  ),
}

export type IconName = keyof typeof paths

export function Icon({
  name,
  className,
  filled = false,
  strokeWidth = 1.4,
}: {
  name: IconName | string
  className?: string
  filled?: boolean
  strokeWidth?: number
}) {
  const node = paths[name as IconName] ?? paths.sparkle
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('h-6 w-6 shrink-0', className)}
    >
      {node}
    </svg>
  )
}

/** Brand marks render solid; line icons render stroked. */
export const SOLID_ICONS = new Set(['facebook', 'x', 'telegram', 'heart', 'play', 'quote', 'sparkle'])
