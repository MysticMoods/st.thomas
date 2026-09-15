'use client'

import { SOLID_ICONS, Icon } from './ui/Icon'
import { cn } from '@/lib/utils'
import type { SiteContent } from '@/lib/types'

const ICON_FOR: Record<string, string> = {
  facebook: 'facebook',
  instagram: 'instagram',
  youtube: 'youtube',
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  x: 'x',
  email: 'mail',
  website: 'globe',
}

export function SocialRow({
  social,
  className,
  tone = 'default',
}: {
  social: SiteContent['social']
  className?: string
  tone?: 'default' | 'invert'
}) {
  return (
    <ul className={cn('flex flex-wrap gap-2.5', className)}>
      {social.map((item) => {
        const icon = ICON_FOR[item.network] ?? 'globe'
        return (
          <li key={item.network}>
            <a
              href={item.url}
              target={item.url.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer noopener"
              title={`${item.label} · ${item.handle}`}
              aria-label={`${item.label} — ${item.handle}`}
              className={cn(
                'group grid h-11 w-11 place-items-center rounded-sm border transition-all duration-400 ease-sacred hover:-translate-y-0.5',
                tone === 'invert'
                  ? 'border-white/15 text-stone-300 hover:border-gold-300/70 hover:bg-white/5 hover:text-gold-200'
                  : 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-400 hover:bg-gold-400/10 hover:text-gold-600 dark:hover:text-gold-300',
              )}
            >
              <Icon
                name={icon}
                filled={SOLID_ICONS.has(icon)}
                className="h-[1.15rem] w-[1.15rem]"
              />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
