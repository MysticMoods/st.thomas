'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { NoticesContent } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

const CATEGORY_TONE: Record<string, string> = {
  news: 'border-navy-300/60 text-navy-600 dark:border-navy-500/50 dark:text-navy-200',
  feast: 'border-gold-400/70 text-gold-700 dark:text-gold-300',
  prayer: 'border-stone-400/60 text-stone-600 dark:text-stone-300',
  funeral: 'border-navy-400/50 text-navy-500 dark:text-navy-300',
  banns: 'border-burgundy-400/60 text-burgundy-600 dark:text-burgundy-300',
  catechism: 'border-gold-500/50 text-gold-700 dark:text-gold-400',
  youth: 'border-burgundy-300/70 text-burgundy-500 dark:text-burgundy-300',
  community: 'border-stone-500/50 text-stone-700 dark:text-stone-300',
}

export function Notices({ notices }: { notices: NoticesContent }) {
  const { t, lang } = useLang()
  const [category, setCategory] = useState('all')
  const [open, setOpen] = useState<string | null>(null)

  const items = useMemo(() => {
    const list =
      category === 'all' ? notices.items : notices.items.filter((n) => n.category === category)
    return [...list].sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1
      return b.date.localeCompare(a.date)
    })
  }, [category, notices.items])

  const labelFor = (id: string) =>
    notices.categories.find((c) => c.id === id)?.label ?? { en: id, ml: id }

  return (
    <section id="notices" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Announcements', ml: 'അറിയിപ്പുകൾ' }}
          title={notices.title}
          subtitle={notices.subtitle}
        />

        <div className="no-scrollbar mt-14 flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:justify-center">
          {notices.categories.map((cat) => (
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

        <motion.ul layout className="mt-12 grid gap-5 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {items.map((notice) => {
              const isOpen = open === notice.id
              return (
                <motion.li
                  layout
                  key={notice.id}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    'card group flex flex-col transition-all duration-500',
                    notice.pinned && 'border-gold-400/50 shadow-inner_gold',
                    isOpen ? 'shadow-lift' : 'card-hover',
                  )}
                >
                  {notice.image ? (
                    <SmartImage
                      src={notice.image}
                      alt={t(notice.title)}
                      width={1200}
                      height={675}
                      zoom
                      sizes="(max-width: 1024px) 92vw, 44vw"
                      wrapperClassName="aspect-[16/9] w-full"
                      className="h-full w-full object-cover"
                    />
                  ) : null}

                  <div className={cn('flex flex-col p-7 sm:p-8', notice.image && 'pt-6 sm:pt-7')}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em]',
                        CATEGORY_TONE[notice.category] ?? CATEGORY_TONE.news,
                      )}
                    >
                      {t(labelFor(notice.category))}
                    </span>
                    <span className="flex items-center gap-1.5 font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                      <Icon name="calendar" className="h-3.5 w-3.5 text-gold-500/80" />
                      {formatDate(notice.date, lang)}
                    </span>
                    {notice.pinned ? (
                      <span className="ml-auto flex items-center gap-1.5 font-sans text-[0.6rem] uppercase tracking-[0.14em] text-gold-600 dark:text-gold-300">
                        <Icon name="bell" className="h-3.5 w-3.5" />
                        {t({ en: 'Pinned', ml: 'പ്രധാനം' })}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-5 font-display text-xl leading-snug text-[rgb(var(--ink))] sm:text-2xl">
                    {t(notice.title)}
                  </h3>

                  <p className="mt-3 font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
                    {t(notice.excerpt)}
                  </p>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="mt-4 border-l-2 border-gold-400/50 pl-5 font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
                          {t(notice.body)}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : notice.id)}
                    aria-expanded={isOpen}
                    className="group mt-6 flex items-center gap-2 self-start font-sans text-2xs font-semibold uppercase tracking-[0.18em] text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
                  >
                    {t(isOpen ? ui.common.readLess : ui.common.readMore)}
                    <Icon
                      name={isOpen ? 'minus' : 'arrowRight'}
                      className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </button>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </motion.ul>
      </div>
    </section>
  )
}
