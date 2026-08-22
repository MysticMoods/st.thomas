'use client'

import { motion } from 'framer-motion'

import { useLang } from '@/lib/i18n'
import type { ChapelsContent } from '@/lib/types'

import { Icon } from './ui/Icon'
import { SmartImage } from './ui/SmartImage'

/**
 * The chapels of the parish.
 *
 * A parish is not only its church. The kurishupallis are where a good many
 * people actually pray — the one at the far end of the ward, the one an elderly
 * couple can walk to. Four things and no more: the photograph, the name, where
 * it is, and when people gather there.
 *
 * Nothing renders at all when no chapel has been written in, so a parish
 * without any is never shown an empty heading.
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
              className="overflow-hidden rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]"
            >
              {chapel.image ? (
                <SmartImage
                  src={chapel.image}
                  alt={t(chapel.name)}
                  fill
                  sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                  wrapperClassName="aspect-[4/3] w-full"
                  className="object-cover"
                />
              ) : null}

              <div className="p-6">
                <h3 className="font-display text-2xl text-[rgb(var(--ink))]">{t(chapel.name)}</h3>

                {chapel.place ? (
                  <p className="mt-3 flex items-start gap-2 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                    <Icon name="mapPin" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
                    <span>{t(chapel.place)}</span>
                  </p>
                ) : null}

                {chapel.time ? (
                  <p className="mt-2 flex items-start gap-2 font-sans text-sm leading-relaxed text-[rgb(var(--ink))]">
                    <Icon name="clock" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
                    <span>{t(chapel.time)}</span>
                  </p>
                ) : null}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
