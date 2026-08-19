'use client'

import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { Obituary, ObituariesContent } from '@/lib/types'
import { cn, formatDate, formatNumber } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Modal, useDialogId } from './ui/Modal'
import { Reveal, StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

/** Most recent death first. */
function byDate(items: Obituary[]) {
  return [...items].sort((a, b) => b.died.localeCompare(a.died))
}

function year(iso: string) {
  return iso.slice(0, 4)
}

/**
 * One memorial card. The photograph is held in a soft frame and desaturated —
 * this column should read as a remembrance, never as a gallery.
 */
export function ObituaryCard({
  person,
  onOpen,
  compact = false,
}: {
  person: Obituary
  onOpen: () => void
  compact?: boolean
}) {
  const { t, lang } = useLang()

  return (
    <button
      type="button"
      onClick={onOpen}
      className="card card-hover group flex w-full flex-col text-left"
    >
      <span className="relative block overflow-hidden">
        <SmartImage
          src={person.image}
          alt={t(person.name)}
          width={640}
          height={compact ? 640 : 800}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
          wrapperClassName={cn('w-full', compact ? 'aspect-square' : 'aspect-[4/5]')}
          className="h-full w-full object-cover grayscale transition-[filter,transform] duration-[1200ms] ease-sacred group-hover:grayscale-[0.35]"
          zoom
        />
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent"
          aria-hidden="true"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-baseline gap-2 p-5">
          <span className="font-display text-lg leading-tight text-white">{t(person.name)}</span>
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-2 p-5 sm:p-6">
        <span className="flex items-center gap-2 font-sans text-2xs tabular-nums text-gold-600 dark:text-gold-400">
          <Icon name="candle" className="h-3.5 w-3.5" />
          {year(person.born)} – {year(person.died)}
          <span className="text-[rgb(var(--muted))]">
            · {formatNumber(person.age, lang)} {t({ en: 'years', ml: 'വയസ്സ്' })}
          </span>
        </span>

        <span className="font-sans text-2xs text-[rgb(var(--muted))]">{t(person.house)}</span>

        <span className="mt-auto flex items-center gap-2 pt-3 font-sans text-2xs font-semibold uppercase tracking-[0.16em] text-gold-600 transition-colors group-hover:text-gold-500 dark:text-gold-400">
          {t({ en: 'Remembrance', ml: 'അനുസ്മരണം' })}
          <Icon
            name="arrowRight"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </span>
    </button>
  )
}

/** The full memorial, opened from a card. */
export function ObituaryDialog({
  person,
  prayer,
  onClose,
}: {
  person: Obituary | null
  prayer: ObituariesContent['prayer']
  onClose: () => void
}) {
  const { t, lang } = useLang()
  const titleId = useDialogId('obituary')

  return (
    <Modal open={person !== null} onClose={onClose} labelledBy={titleId} className="max-w-2xl">
      {person ? (
        <div>
          <div className="relative">
            <SmartImage
              src={person.image}
              alt={t(person.name)}
              width={1200}
              height={700}
              sizes="(max-width: 768px) 100vw, 42rem"
              wrapperClassName="aspect-[16/9] w-full"
              className="h-full w-full object-cover grayscale-[0.7]"
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/55 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <span className="font-sans text-2xs uppercase tracking-[0.22em] text-gold-300">
                {t({ en: 'In loving memory', ml: 'സ്നേഹപൂർവ്വമായ ഓർമ്മയിൽ' })}
              </span>
              <h2 id={titleId} className="mt-2 font-display text-3xl text-white sm:text-4xl">
                {t(person.name)}
              </h2>
              <p className="mt-2 font-sans text-2xs tabular-nums text-stone-300/85">
                {formatDate(person.born, lang)} — {formatDate(person.died, lang)}
                {' · '}
                {formatNumber(person.age, lang)} {t({ en: 'years', ml: 'വയസ്സ്' })}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact icon="home" label={{ en: 'House', ml: 'ഭവനം' }} value={t(person.house)} />
              <Fact icon="users" label={{ en: 'Family unit', ml: 'കുടുംബക്കൂട്ടായ്മ' }} value={t(person.unit)} />
              <Fact
                icon="calendar"
                label={{ en: 'Funeral', ml: 'സംസ്കാര ശുശ്രൂഷ' }}
                value={`${formatDate(person.funeral.date, lang)} · ${t(person.funeral.time)}`}
              />
              <Fact icon="mapPin" label={{ en: 'Place', ml: 'സ്ഥലം' }} value={t(person.funeral.place)} />
            </dl>

            <p className="mt-7 border-l-2 border-gold-400/50 pl-5 font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
              {t(person.survivedBy)}
            </p>

            <p className="mt-6 font-serif text-xl italic leading-relaxed text-[rgb(var(--ink))]">
              {t(person.tribute)}
            </p>

            <div className="mt-8 rounded-sm border border-gold-400/30 bg-gold-400/[0.06] p-5 text-center">
              <Icon name="cross" className="mx-auto h-5 w-5 text-gold-500" />
              <p className="mt-3 font-serif text-lg italic leading-relaxed text-[rgb(var(--ink))]">
                {t(prayer)}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: string
  label: { en: string; ml: string }
  value: string
}) {
  const { t } = useLang()
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-gold-400/30 text-gold-600 dark:text-gold-400">
        <Icon name={icon} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <dt className="font-sans text-[0.6rem] uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
          {t(label)}
        </dt>
        <dd className="mt-1 font-sans text-sm text-[rgb(var(--ink))]">{value}</dd>
      </div>
    </div>
  )
}

/** The strip on the homepage — the four most recent, and a way through to all. */
export function Obituaries({ obituaries }: { obituaries: ObituariesContent }) {
  const { t } = useLang()
  const [open, setOpen] = useState<Obituary | null>(null)
  const recent = useMemo(() => byDate(obituaries.items).slice(0, 4), [obituaries.items])

  if (recent.length === 0) return null

  return (
    <section id="obituary" className="section-tight bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Remembrance', ml: 'അനുസ്മരണം' }}
          title={obituaries.title}
          subtitle={obituaries.subtitle}
        />

        <StaggerGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((person) => (
            <motion.div key={person.id} variants={staggerItem}>
              <ObituaryCard person={person} compact onOpen={() => setOpen(person)} />
            </motion.div>
          ))}
        </StaggerGroup>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center gap-5 text-center">
            <p className="max-w-2xl font-serif text-lg italic leading-relaxed text-[rgb(var(--muted))]">
              {t(obituaries.prayer)}
            </p>
            <a href="/obituary" className="btn-outline">
              {t({ en: 'The full obituary column', ml: 'പൂർണ്ണമായ ചരമ പംക്തി' })}
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      </div>

      <ObituaryDialog person={open} prayer={obituaries.prayer} onClose={() => setOpen(null)} />
    </section>
  )
}

/** The archive at /obituary — everything, filtered by year. */
export function ObituaryArchive({ obituaries }: { obituaries: ObituariesContent }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState<Obituary | null>(null)
  const [filter, setFilter] = useState('all')

  const sorted = useMemo(() => byDate(obituaries.items), [obituaries.items])
  const years = useMemo(
    () => Array.from(new Set(sorted.map((person) => year(person.died)))),
    [sorted],
  )
  const shown = filter === 'all' ? sorted : sorted.filter((person) => year(person.died) === filter)

  return (
    <section className="section-first bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Parish Register', ml: 'ഇടവക രജിസ്റ്റർ' }}
          title={obituaries.title}
          subtitle={obituaries.subtitle}
        />

        {years.length > 1 ? (
          <div className="no-scrollbar mt-12 flex justify-start gap-2 overflow-x-auto pb-2 md:justify-center">
            {[{ id: 'all', label: t({ en: 'All years', ml: 'എല്ലാ വർഷവും' }) }].concat(
              years.map((value) => ({ id: value, label: value })),
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                className={cn(
                  'shrink-0 rounded-sm border px-4 py-2.5 font-sans text-2xs font-medium uppercase tracking-[0.16em] tabular-nums transition-all duration-300',
                  filter === option.id
                    ? 'border-gold-400 bg-gold-400 text-navy-950'
                    : 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-300 hover:text-gold-600 dark:hover:text-gold-300',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        <p className="mt-10 text-center font-sans text-2xs uppercase tracking-[0.18em] tabular-nums text-[rgb(var(--muted))]">
          {formatNumber(shown.length, lang)}{' '}
          {t(
            shown.length === 1
              ? { en: 'memorial', ml: 'അനുസ്മരണം' }
              : { en: 'memorials', ml: 'അനുസ്മരണങ്ങൾ' },
          )}
          {filter === 'all' ? '' : ` · ${filter}`}
        </p>

        {shown.length === 0 ? (
          <p className="mt-10 text-center font-serif text-lg italic text-[rgb(var(--muted))]">
            {t({
              en: 'No deaths are recorded for this year.',
              ml: 'ഈ വർഷത്തേക്ക് മരണങ്ങളൊന്നും രേഖപ്പെടുത്തിയിട്ടില്ല.',
            })}
          </p>
        ) : (
          <StaggerGroup className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((person) => (
              <motion.div key={person.id} variants={staggerItem}>
                <ObituaryCard person={person} onOpen={() => setOpen(person)} />
              </motion.div>
            ))}
          </StaggerGroup>
        )}

        <Reveal delay={0.08}>
          <div className="mx-auto mt-14 max-w-2xl rounded-sm border border-gold-400/30 bg-gold-400/[0.05] p-7 text-center sm:p-9">
            <Icon name="cross" className="mx-auto h-5 w-5 text-gold-500" />
            <p className="mt-4 font-serif text-xl italic leading-relaxed text-[rgb(var(--ink))]">
              {t(obituaries.prayer)}
            </p>
            <p className="mt-5 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
              {t(obituaries.note)}
            </p>
            <a href="/#contact" className="btn-outline mt-7">
              {t({ en: 'Contact the parish office', ml: 'ഇടവക ഓഫീസുമായി ബന്ധപ്പെടുക' })}
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      </div>

      <ObituaryDialog person={open} prayer={obituaries.prayer} onClose={() => setOpen(null)} />
    </section>
  )
}
