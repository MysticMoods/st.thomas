'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { L, MinistriesContent } from '@/lib/types'
import { cn, formatDate, formatNumber, telHref } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Modal, useDialogId } from './ui/Modal'
import { StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

type Ministry = MinistriesContent['items'][number]
type TabId = 'about' | 'groups' | 'team' | 'events' | 'history'

const FALLBACK_LABELS: Record<TabId, L> = {
  about: { en: 'About', ml: 'വിവരണം' },
  groups: { en: 'Groups', ml: 'ഗ്രൂപ്പുകൾ' },
  team: { en: 'Members', ml: 'അംഗങ്ങൾ' },
  events: { en: 'Events', ml: 'പരിപാടികൾ' },
  history: { en: 'History', ml: 'ചരിത്രം' },
}

export function Ministries({ ministries }: { ministries: MinistriesContent }) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState<Ministry | null>(null)

  return (
    <section id="ministries" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Get Involved', ml: 'പങ്കാളികളാകുക' }}
          title={ministries.title}
          subtitle={ministries.subtitle}
        />

        <StaggerGroup className="mt-10 grid grid-cols-2 gap-3 sm:mt-20 sm:gap-5 lg:grid-cols-3 xl:grid-cols-5">
          {ministries.items.map((item) => (
            <motion.button
              key={item.id}
              type="button"
              variants={staggerItem}
              onClick={() => setOpen(item)}
              aria-haspopup="dialog"
              className="card card-hover group flex flex-col gap-4 p-7 text-left"
            >
              <span className="grid h-12 w-12 place-items-center rounded-sm border border-gold-400/30 bg-gold-400/[0.07] text-gold-600 transition-all duration-500 ease-sacred group-hover:border-gold-400/70 group-hover:bg-gold-400/15 dark:text-gold-300">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>

              <span className="font-display text-xl leading-snug text-[rgb(var(--ink))]">
                {t(item.name)}
              </span>

              <span className="flex-1 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                {t(item.description)}
              </span>

              <span className="mt-2 flex items-center justify-between border-t border-[rgb(var(--line))] pt-4">
                <span className="flex items-center gap-1.5 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-gold-600 dark:text-gold-400">
                  {t({ en: 'Details', ml: 'വിശദാംശങ്ങൾ' })}
                  <Icon
                    name="arrowRight"
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
                <span className="flex items-center gap-1.5 font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                  <Icon name="users" className="h-3.5 w-3.5" />
                  {formatNumber(item.members, lang)}
                </span>
              </span>
            </motion.button>
          ))}
        </StaggerGroup>
      </div>

      <MinistryDialog
        ministry={open}
        labels={ministries.labels}
        onClose={() => setOpen(null)}
      />
    </section>
  )
}

function MinistryDialog({
  ministry,
  labels,
  onClose,
}: {
  ministry: Ministry | null
  labels: MinistriesContent['labels']
  onClose: () => void
}) {
  const { t, lang } = useLang()
  const titleId = useDialogId('ministry')
  const [tab, setTab] = useState<TabId>('about')

  // A ministry may name its own groups — Units for the family units, Classes
  // for the Sunday school — rather than take the general word for them.
  const label = (id: TabId) =>
    id === 'groups' && ministry?.groupsLabel
      ? t(ministry.groupsLabel)
      : t(labels?.[id] ?? FALLBACK_LABELS[id])

  const close = () => {
    onClose()
    setTab('about')
  }

  // Only offer a tab that has something behind it.
  const tabs: TabId[] = ministry
    ? ([
        'about',
        ministry.groups?.length ? 'groups' : null,
        ministry.team?.length ? 'team' : null,
        ministry.events?.length ? 'events' : null,
        ministry.history ? 'history' : null,
      ].filter(Boolean) as TabId[])
    : ['about']

  const active = tabs.includes(tab) ? tab : 'about'

  return (
    <Modal
      open={ministry !== null}
      onClose={close}
      labelledBy={titleId}
      className="max-w-4xl"
    >
      {ministry ? (
        <div>
          {/* header */}
          <div className="relative">
            {ministry.image ? (
              <>
                <SmartImage
                  src={ministry.image}
                  alt=""
                  width={1400}
                  height={620}
                  sizes="(max-width: 768px) 100vw, 56rem"
                  wrapperClassName="aspect-[21/9] w-full"
                  className="h-full w-full object-cover"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-navy-950/20"
                  aria-hidden="true"
                />
              </>
            ) : null}

            <div
              className={cn(
                'p-6 sm:p-8',
                ministry.image ? 'absolute inset-x-0 bottom-0' : 'bg-navy-950',
              )}
            >
              <span className="inline-grid h-11 w-11 place-items-center rounded-sm border border-gold-300/40 bg-navy-950/50 text-gold-300 backdrop-blur">
                <Icon name={ministry.icon} className="h-5 w-5" />
              </span>
              <h2 id={titleId} className="mt-4 font-display text-3xl text-white sm:text-4xl">
                {t(ministry.name)}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-2xs text-stone-300/85">
                <span className="flex items-center gap-1.5">
                  <Icon name="users" className="h-3.5 w-3.5 text-gold-300" />
                  {formatNumber(ministry.members, lang)} {t({ en: 'members', ml: 'അംഗങ്ങൾ' })}
                </span>
                {ministry.since ? (
                  <span className="flex items-center gap-1.5 tabular-nums">
                    <Icon name="scroll" className="h-3.5 w-3.5 text-gold-300" />
                    {t({ en: 'Since', ml: 'മുതൽ' })} {ministry.since}
                  </span>
                ) : null}
                {ministry.meets ? (
                  <span className="flex items-center gap-1.5">
                    <Icon name="clock" className="h-3.5 w-3.5 text-gold-300" />
                    {t(ministry.meets)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* tabs */}
          {tabs.length > 1 ? (
            <div
              role="tablist"
              aria-label={t(ministry.name)}
              className="no-scrollbar flex gap-1 overflow-x-auto border-b border-[rgb(var(--line))] px-4 sm:px-6"
            >
              {tabs.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    'relative shrink-0 px-4 py-4 font-sans text-2xs font-semibold uppercase tracking-[0.16em] transition-colors',
                    active === id
                      ? 'text-gold-600 dark:text-gold-300'
                      : 'text-[rgb(var(--muted))] hover:text-gold-500',
                  )}
                >
                  {label(id)}
                  {/* a plain rule, not a shared layout animation — the panel has
                      to be able to unmount the moment it is closed */}
                  <span
                    className={cn(
                      'absolute inset-x-2 bottom-0 h-0.5 origin-left bg-gold-400 transition-transform duration-300 ease-sacred',
                      active === id ? 'scale-x-100' : 'scale-x-0',
                    )}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          ) : null}

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                {active === 'about' ? <AboutTab ministry={ministry} onClose={close} /> : null}
                {active === 'groups' ? <GroupsTab ministry={ministry} /> : null}
                {active === 'team' ? <TeamTab ministry={ministry} /> : null}
                {active === 'events' ? <EventsTab ministry={ministry} /> : null}
                {active === 'history' ? (
                  <p className="font-sans text-[0.98rem] leading-[1.85] text-[rgb(var(--muted))]">
                    {t(ministry.history)}
                  </p>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}

function AboutTab({ ministry, onClose }: { ministry: Ministry; onClose: () => void }) {
  const { t } = useLang()

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
      <div>
        <p className="font-sans text-[0.98rem] leading-[1.85] text-[rgb(var(--muted))]">
          {t(ministry.description)}
        </p>

        {ministry.activities?.length ? (
          <ul className="mt-7 flex flex-col gap-3">
            {ministry.activities.map((activity) => (
              <li key={activity.en} className="flex gap-3">
                <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-gold-500" />
                <span className="font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                  {t(activity)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {ministry.joinNote ? (
          <p className="mt-7 border-l-2 border-gold-400/50 pl-5 font-serif text-lg italic leading-relaxed text-[rgb(var(--ink))]">
            {t(ministry.joinNote)}
          </p>
        ) : null}
      </div>

      {/* the person to speak to */}
      <aside className="h-fit rounded-sm border border-gold-400/30 bg-gold-400/[0.05] p-6">
        <span className="font-sans text-[0.6rem] uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
          {t({ en: 'Led by', ml: 'നേതൃത്വം' })}
        </span>

        <div className="mt-4 flex items-center gap-4">
          {ministry.leadImage ? (
            <SmartImage
              src={ministry.leadImage}
              alt={t(ministry.lead)}
              width={160}
              height={160}
              sizes="64px"
              wrapperClassName="h-16 w-16 shrink-0 rounded-full"
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-gold-400/40 text-gold-500">
              <Icon name="users" className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight text-[rgb(var(--ink))]">
              {t(ministry.lead)}
            </p>
            {ministry.leadRole ? (
              <p className="mt-1 font-sans text-2xs text-gold-600 dark:text-gold-400">
                {t(ministry.leadRole)}
              </p>
            ) : null}
          </div>
        </div>

        <dl className="mt-6 flex flex-col gap-3 border-t border-gold-400/20 pt-5">
          {ministry.meets ? (
            <Line icon="clock" label={{ en: 'Meets', ml: 'യോഗം' }} value={t(ministry.meets)} />
          ) : null}
          {ministry.place ? (
            <Line icon="mapPin" label={{ en: 'Where', ml: 'സ്ഥലം' }} value={t(ministry.place)} />
          ) : null}
        </dl>

        {ministry.leadPhone ? (
          <a href={telHref(ministry.leadPhone)} className="btn-outline mt-6 w-full !px-4 !py-3">
            <Icon name="phone" className="h-4 w-4" />
            {ministry.leadPhone}
          </a>
        ) : null}
        {/* the panel must get out of the way before the page can scroll */}
        <a href="#contact" onClick={onClose} className="btn-outline mt-3 w-full !px-4 !py-3">
          {t(ui.contact.heading)}
        </a>
      </aside>
    </div>
  )
}

function Line({ icon, label, value }: { icon: string; label: L; value: string }) {
  const { t } = useLang()
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-500" />
      <div className="min-w-0">
        <dt className="font-sans text-[0.58rem] uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
          {t(label)}
        </dt>
        <dd className="font-sans text-sm text-[rgb(var(--ink))]">{value}</dd>
      </div>
    </div>
  )
}

function TeamTab({ ministry }: { ministry: Ministry }) {
  const { t, lang } = useLang()

  return (
    <div>
      <p className="font-sans text-sm text-[rgb(var(--muted))]">
        {t({ en: 'Office bearers of', ml: 'ഭാരവാഹികൾ —' })} {t(ministry.name)}
        {' · '}
        <span className="tabular-nums">{formatNumber(ministry.members, lang)}</span>{' '}
        {t({ en: 'members in all', ml: 'ആകെ അംഗങ്ങൾ' })}
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {ministry.team?.map((person) => (
          <li
            key={person.name.en}
            className="flex items-center gap-4 rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-4"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold-400/30 font-display text-sm text-gold-600 dark:text-gold-400">
              {person.name.en.slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block font-sans text-sm font-medium text-[rgb(var(--ink))]">
                {t(person.name)}
              </span>
              <span className="mt-0.5 block font-sans text-2xs text-[rgb(var(--muted))]">
                {t(person.role)}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
        {t({
          en: 'Full membership lists are kept in the parish register and are not published online.',
          ml: 'പൂർണ്ണമായ അംഗത്വ പട്ടിക ഇടവക രജിസ്റ്ററിൽ സൂക്ഷിക്കുന്നു; ഓൺലൈനിൽ പ്രസിദ്ധീകരിക്കുന്നില്ല.',
        })}
      </p>
    </div>
  )
}

function EventsTab({ ministry }: { ministry: Ministry }) {
  const { t, lang } = useLang()
  const events = [...(ministry.events ?? [])].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <ol className="relative flex flex-col gap-6 pl-8">
      <span className="rule-y" aria-hidden="true" />
      {events.map((event) => (
        <li key={`${event.date}-${event.title.en}`} className="relative">
          <span
            className="absolute -left-8 top-1.5 grid h-3 w-3 -translate-x-1/2 place-items-center rounded-full border border-gold-400 bg-[rgb(var(--page))]"
            aria-hidden="true"
          />
          <p className="font-sans text-2xs font-semibold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400">
            {formatDate(event.date, lang)}
          </p>
          <p className="mt-1.5 font-display text-lg leading-snug text-[rgb(var(--ink))]">
            {t(event.title)}
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-sans text-2xs text-[rgb(var(--muted))]">
            <Icon name="mapPin" className="h-3.5 w-3.5" />
            {t(event.place)}
          </p>
        </li>
      ))}
    </ol>
  )
}

/**
 * The units of the family-unit ministry, or the classes of the Sunday school.
 *
 * Both are the same question asked twice — which one am I in, and who do I
 * ring? — so both are answered the same way: the group, anything worth knowing
 * under the name, and the people, with their numbers as links a phone can dial
 * rather than digits to copy out by hand.
 */
/**
 * The people whose names have actually been filled in. A row with an empty name
 * and an empty telephone number is not a person: it is the office's half of the
 * work, and the page should say so plainly rather than print a blank line.
 */
function named(group: NonNullable<Ministry['groups']>[number]) {
  return (group.people ?? []).filter((person) => person.name?.en?.trim() || person.name?.ml?.trim())
}

function GroupsTab({ ministry }: { ministry: Ministry }) {
  const { t } = useLang()
  const groups = ministry.groups ?? []
  const [open, setOpen] = useState<number | null>(null)

  const label = ministry.groupsLabel ?? { en: 'Groups', ml: 'ഗ്രൂപ്പുകൾ' }
  const count = (
    <p className="font-sans text-sm text-[rgb(var(--muted))]">
      {t(label)} — <span className="tabular-nums">{groups.length}</span>{' '}
      {t({ en: 'in all', ml: 'ആകെ' })}
    </p>
  )

  // A group with fifteen names in it is a page of its own; one with a teacher
  // reads better where it stands. The content file says which this is.
  if (!ministry.groupsDrilldown) {
    return (
      <div>
        {count}
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {groups.map((group, index) => (
            <li
              key={`${group.name.en}-${group.division ?? index}`}
              className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-4"
            >
              <GroupTitle group={group} />
              {group.note ? (
                <p className="mt-1 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                  {t(group.note)}
                </p>
              ) : null}
              {named(group).length ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-dashed border-[rgb(var(--line))] pt-3">
                  {named(group).map((person, i) => (
                    <PersonRow key={`${person.name.en}-${i}`} person={person} />
                  ))}
                </ul>
              ) : (
                <p className="mt-3 font-sans text-2xs text-[rgb(var(--muted))]">
                  {t({ en: 'Names to follow.', ml: 'പേരുകൾ ഉടൻ ചേർക്കും.' })}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const current = open === null ? null : groups[open]

  if (current) {
    const people = named(current)
    const bearers = people.filter((person) => person.office)
    const leaders = people.filter((person) => !person.office)

    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(null)}
          className="flex items-center gap-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:text-gold-500"
        >
          <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" />
          {t({ en: 'All', ml: 'എല്ലാം' })} {t(label)}
        </button>

        <div className="mt-5 border-b border-[rgb(var(--line))] pb-5">
          <GroupTitle group={current} large />
          {current.note ? (
            <p className="mt-2 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
              {t(current.note)}
            </p>
          ) : null}
        </div>

        {bearers.length ? (
          <div className="mt-6">
            <h4 className="font-sans text-2xs uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400">
              {t({ en: 'Office bearers', ml: 'ഭാരവാഹികൾ' })}
            </h4>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {bearers.map((person, i) => (
                <li
                  key={`${person.name.en}-${i}`}
                  className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-3"
                >
                  <PersonRow person={person} stacked />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {leaders.length ? (
          <div className="mt-7">
            <h4 className="font-sans text-2xs uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400">
              {t({ en: 'Group leaders', ml: 'ഗ്രൂപ്പ് ലീഡർമാർ' })} —{' '}
              <span className="tabular-nums">{leaders.length}</span>
            </h4>
            <ul className="mt-3 flex flex-col gap-2 rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-4">
              {leaders.map((person, i) => (
                <li
                  key={`${person.name.en}-${i}`}
                  className="border-b border-dashed border-[rgb(var(--line))] pb-2 last:border-0 last:pb-0"
                >
                  <PersonRow person={person} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {people.length === 0 ? (
          <p className="mt-6 font-sans text-2xs text-[rgb(var(--muted))]">
            {t({ en: 'Names to follow.', ml: 'പേരുകൾ ഉടൻ ചേർക്കും.' })}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      {count}
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {groups.map((group, index) => (
          <li key={`${group.name.en}-${group.division ?? index}`}>
            <button
              type="button"
              onClick={() => setOpen(index)}
              className="group flex w-full items-center gap-3 rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-4 text-left transition-colors hover:border-gold-400/70"
            >
              <span className="min-w-0 flex-1">
                <GroupTitle group={group} />
                <span className="mt-1 block font-sans text-2xs text-[rgb(var(--muted))]">
                  <span className="tabular-nums">{named(group).length}</span>{' '}
                  {t({ en: 'named', ml: 'പേരുകൾ' })}
                </span>
              </span>
              <Icon
                name="arrowRight"
                className="h-4 w-4 shrink-0 text-[rgb(var(--muted))] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-gold-500"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GroupTitle({
  group,
  large = false,
}: {
  group: NonNullable<Ministry['groups']>[number]
  large?: boolean
}) {
  const { t } = useLang()
  return (
    <span className="flex flex-wrap items-baseline gap-2">
      <span
        className={cn(
          'font-serif text-[rgb(var(--ink))]',
          large ? 'text-xl' : 'text-base',
        )}
      >
        {t(group.name)}
      </span>
      {group.division ? (
        <span className="rounded-sm border border-gold-400/40 px-1.5 py-0.5 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-gold-600 dark:text-gold-400">
          {group.division}
        </span>
      ) : null}
    </span>
  )
}

function PersonRow({
  person,
  stacked = false,
}: {
  person: { name: L; role?: L; phone?: string; office?: boolean }
  stacked?: boolean
}) {
  const { t } = useLang()
  const phone = person.phone ? (
    <a
      href={telHref(person.phone)}
      className={cn(
        'font-sans text-2xs tabular-nums text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400',
        stacked ? 'mt-1 block' : 'ml-auto',
      )}
    >
      {person.phone}
    </a>
  ) : null

  if (stacked) {
    return (
      <>
        {person.role ? (
          <p className="font-sans text-[0.6rem] uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
            {t(person.role)}
          </p>
        ) : null}
        <p className="mt-1 font-sans text-sm text-[rgb(var(--ink))]">{t(person.name)}</p>
        {phone}
      </>
    )
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <span className="font-sans text-sm text-[rgb(var(--ink))]">{t(person.name)}</span>
      {person.role ? (
        <span className="font-sans text-2xs uppercase tracking-[0.12em] text-[rgb(var(--muted))]">
          {t(person.role)}
        </span>
      ) : null}
      {phone}
    </span>
  )
}
