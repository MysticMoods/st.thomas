'use client'

import { useLang } from '@/lib/i18n'
import type { L } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Reveal } from './Reveal'

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  tone = 'default',
  className,
}: {
  eyebrow?: L | string
  title: L | string
  subtitle?: L | string
  align?: 'center' | 'left'
  tone?: 'default' | 'invert'
  className?: string
}) {
  const { t } = useLang()

  return (
    <div
      className={cn(
        'flex max-w-3xl flex-col gap-5',
        align === 'center' ? 'mx-auto items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow ? (
        <Reveal duration={0.7}>
          <span className={cn('eyebrow', tone === 'invert' && 'text-gold-300')}>{t(eyebrow)}</span>
        </Reveal>
      ) : null}

      <Reveal delay={0.06}>
        <h2 className={cn('heading-lg', tone === 'invert' && 'text-white')}>{t(title)}</h2>
      </Reveal>

      <Reveal delay={0.12}>
        <span
          className={cn('gold-rule', align === 'center' && 'mx-auto')}
          aria-hidden="true"
        />
      </Reveal>

      {subtitle ? (
        <Reveal delay={0.16}>
          <p className={cn('lede', tone === 'invert' && 'text-stone-200/85')}>{t(subtitle)}</p>
        </Reveal>
      ) : null}
    </div>
  )
}
