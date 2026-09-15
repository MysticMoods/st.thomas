'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

import { useLang } from '@/lib/i18n'
import type { HallContent, HallRoom } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'

import { Icon } from '../ui/Icon'
import { Reveal, StaggerGroup, staggerItem } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'
import { SmartImage } from '../ui/SmartImage'
import { HallLightbox } from './HallLightbox'

/** Ticks and crosses for the three things people always ring up to ask. */
function Features({ room }: { room: HallRoom }) {
  const { t } = useLang()
  const items = [
    { on: room.features.ac, label: { en: 'Air conditioning', ml: 'എയർ കണ്ടീഷനിംഗ്' } },
    { on: room.features.generator, label: { en: 'Generator', ml: 'ജനറേറ്റർ' } },
    { on: room.features.stage, label: { en: 'Stage', ml: 'വേദി' } },
  ]

  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {items.map((item) => (
        <li
          key={item.label.en}
          className={cn(
            'flex items-center gap-1.5 font-sans text-2xs',
            item.on ? 'text-[rgb(var(--ink))]' : 'text-[rgb(var(--muted))]/70 line-through',
          )}
        >
          <Icon
            name={item.on ? 'check' : 'close'}
            className={cn('h-3.5 w-3.5', item.on ? 'text-gold-500' : 'text-[rgb(var(--muted))]/60')}
          />
          {t(item.label)}
        </li>
      ))}
    </ul>
  )
}

/**
 * One card per hall, each with its own photographs. The combined room is drawn
 * last and marked, since it is the other two with the partition folded back.
 */
export function HallRooms({ hall }: { hall: HallContent }) {
  const { t, lang } = useLang()
  const [viewing, setViewing] = useState<{ images: string[]; index: number; title: string } | null>(null)

  return (
    <section id="halls" className="hall-anchor section-tight bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: '02 · The three halls', ml: '02 · മൂന്ന് ഹാളുകൾ' }}
          title={{ en: 'Which one do you need?', ml: 'ഏതാണ് വേണ്ടത്?' }}
          subtitle={{
            en: 'Every hall is let by the session. The medium and large halls can be taken together when the whole building is needed.',
            ml: 'എല്ലാ ഹാളുകളും സെഷൻ അടിസ്ഥാനത്തിലാണ് നൽകുന്നത്. കെട്ടിടം മുഴുവൻ വേണമെങ്കിൽ ഇടത്തരവും വലിയതുമായ ഹാളുകൾ ഒരുമിച്ച് എടുക്കാം.',
          }}
        />

        <StaggerGroup className="mt-16 grid gap-6 lg:grid-cols-2">
          {hall.halls.map((room) => {
            const from = Math.min(...Object.values(room.rates))
            const images = [room.image, ...room.gallery]

            return (
              <motion.article
                key={room.id}
                variants={staggerItem}
                className={cn(
                  'card flex flex-col',
                  Boolean(room.combines?.length) && 'border-gold-400/50',
                )}
              >
                <button
                  type="button"
                  onClick={() => setViewing({ images, index: 0, title: t(room.name) })}
                  className="group relative block w-full text-left"
                >
                  <SmartImage
                    src={room.image}
                    alt={t(room.name)}
                    width={1200}
                    height={750}
                    zoom
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    wrapperClassName="aspect-[16/10] w-full"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute right-4 top-4 flex items-center gap-2 rounded-sm border border-white/40 bg-navy-950/45 px-3 py-1.5 font-sans text-[0.6rem] uppercase tracking-[0.14em] text-white backdrop-blur-sm">
                    <Icon name="plus" className="h-3 w-3" />
                    {formatNumber(images.length, lang)} {t({ en: 'photos', ml: 'ചിത്രങ്ങൾ' })}
                  </span>
                  {room.combines?.length ? (
                    <span className="absolute left-4 top-4 rounded-sm bg-gold-400 px-3 py-1.5 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-navy-950">
                      {t({ en: 'Both halls', ml: 'രണ്ട് ഹാളുകളും' })}
                    </span>
                  ) : null}
                </button>

                <div className="flex flex-1 flex-col gap-4 p-7 sm:p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl text-[rgb(var(--ink))]">{t(room.name)}</h3>
                    <span className="font-sans text-2xs uppercase tracking-[0.14em] text-gold-600 dark:text-gold-400">
                      {t({ en: 'From', ml: 'ആരംഭം' })} ₹{formatNumber(from, lang)}
                    </span>
                  </div>

                  <p className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
                    {formatNumber(room.seated, lang)} {t({ en: 'seated', ml: 'ഇരുന്ന്' })}
                    {' · '}
                    {formatNumber(room.standing, lang)} {t({ en: 'standing', ml: 'നിന്ന്' })}
                  </p>

                  <Features room={room} />

                  <p className="body-text text-[0.95rem]">{t(room.blurb)}</p>

                  {/* the room's own photographs, in small */}
                  <div className="mt-auto grid grid-cols-3 gap-2 pt-2">
                    {room.gallery.map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setViewing({ images, index: i + 1, title: t(room.name) })}
                        className="group overflow-hidden rounded-[7px] border border-[rgb(var(--line))] transition-colors hover:border-gold-400"
                      >
                        <SmartImage
                          src={src}
                          alt=""
                          width={400}
                          height={300}
                          sizes="120px"
                          wrapperClassName="aspect-[4/3] w-full"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </button>
                    ))}
                  </div>

                  <a href={`#book-${room.id}`} className="btn-outline mt-4 self-start">
                    {t({ en: 'Check free days', ml: 'ഒഴിവുള്ള ദിവസങ്ങൾ' })}
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </a>
                </div>
              </motion.article>
            )
          })}
        </StaggerGroup>

        <Reveal delay={0.1}>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {hall.facts.map((fact) => (
              <li key={t(fact.label)} className="rounded-sm border border-[rgb(var(--line))] p-5">
                <p className="eyebrow">{t(fact.label)}</p>
                <p className="mt-2 font-serif text-lg text-[rgb(var(--ink))]">{t(fact.value)}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>

      <HallLightbox
        images={viewing?.images ?? []}
        index={viewing?.index ?? 0}
        title={viewing?.title ?? ''}
        onIndex={(index) => setViewing((current) => (current ? { ...current, index } : current))}
        onClose={() => setViewing(null)}
      />
    </section>
  )
}
