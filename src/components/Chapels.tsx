'use client'

import { motion } from 'framer-motion'

import { useLang } from '@/lib/i18n'
import type { ChapelsContent } from '@/lib/types'

import { Icon } from './ui/Icon'
import { SmartImage } from './ui/SmartImage'

/**
 * The chapels of the parish.
 *
 * A parish is not only its church. The kurishupallis and filial chapels are
 * where a good many people actually hear Mass — the ones at the far end of the
 * ward, the ones an elderly couple can walk to. Somebody looking them up wants
 * three things and no more: where it is, when Mass is said there, and who to
 * ring if that has changed.
 *
 * Nothing renders at all when no chapel has been written in, so a parish
 * without any is not shown an empty heading.
 */
export function Chapels({ chapels }: { chapels: ChapelsContent }) {
  const { t } = useLang()
  const items = (chapels.items ?? []).filter((chapel) => chapel.name?.en || chapel.name?.ml)

  if (items.length === 0) return null

  return (
    <section id="chapels" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <header className="mx-auto max-w-2xl text-center">
          <p className="font-sans text-2xs uppercase tracking-[0.22em] text-gold-600 dark:text-gold-400">
            {t(chapels.subtitle)}
          </p>
          <h2 className="mt-3 font-display text-4xl text-[rgb(var(--ink))] md:text-5xl">
            {t(chapels.title)}
          </h2>
        </header>

        <ul className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {items.map((chapel, index) => (
            <motion.li
              key={chapel.id || chapel.name.en}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.3) }}
              className="flex flex-col overflow-hidden rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]"
            >
              {chapel.image ? (
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <SmartImage
                    src={chapel.image}
                    alt={t(chapel.name)}
                    fill
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : null}

              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-display text-2xl text-[rgb(var(--ink))]">{t(chapel.name)}</h3>

                {chapel.patron ? (
                  <p className="mt-1 font-sans text-2xs uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400">
                    {t(chapel.patron)}
                    {chapel.feast ? ` · ${t(chapel.feast)}` : ''}
                  </p>
                ) : null}

                {chapel.place ? (
                  <p className="mt-3 flex items-start gap-2 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                    <Icon name="mapPin" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
                    <span>{t(chapel.place)}</span>
                  </p>
                ) : null}

                {chapel.entries?.length ? (
                  <ul className="mt-4 flex flex-col gap-1.5 border-t border-[rgb(var(--line))] pt-4">
                    {chapel.entries.map((entry, i) => (
                      <li key={`${entry.time}-${i}`} className="flex items-baseline gap-3">
                        <span className="w-20 shrink-0 font-sans text-sm font-semibold tabular-nums text-[rgb(var(--ink))]">
                          {entry.time}
                        </span>
                        <span className="min-w-0 font-sans text-sm text-[rgb(var(--muted))]">
                          {t(entry.label)}
                          {entry.note ? (
                            <span className="text-2xs"> · {t(entry.note)}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                {chapel.note ? (
                  <p className="mt-4 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                    {t(chapel.note)}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5">
                  {chapel.contact?.phone ? (
                    <a
                      href={`tel:${chapel.contact.phone.replace(/[^+0-9]/g, '')}`}
                      className="inline-flex items-center gap-1.5 font-sans text-2xs text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
                    >
                      <Icon name="phone" className="h-3.5 w-3.5" />
                      {chapel.contact.name ? `${t(chapel.contact.name)} · ` : ''}
                      <span className="tabular-nums">{chapel.contact.phone}</span>
                    </a>
                  ) : null}

                  {chapel.mapUrl ? (
                    <a
                      href={chapel.mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-sans text-2xs text-[rgb(var(--muted))] transition-colors hover:text-gold-500"
                    >
                      <Icon name="mapPin" className="h-3.5 w-3.5" />
                      {t({ en: 'Show on a map', ml: 'ഭൂപടത്തിൽ കാണുക' })}
                    </a>
                  ) : null}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>

        {chapels.note ? (
          <p className="mx-auto mt-10 max-w-xl text-center font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
            {t(chapels.note)}
          </p>
        ) : null}
      </div>
    </section>
  )
}
