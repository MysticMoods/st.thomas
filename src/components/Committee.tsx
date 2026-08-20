'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { CommitteeContent, CommitteeMember } from '@/lib/types'
import { cn, telHref } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Reveal, StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

/** One or two letters for a member with no photograph on file. */
function initials(name: string) {
  return name
    .replace(/^(Fr\.|Sr\.|Mr\.|Mrs\.|Dr\.)\s*/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
}

/**
 * The elected committee, directly under the parish priest. Office bearers are
 * given the larger cards; the rest of the members follow in a tighter grid so
 * that a body of eighteen people still reads at a glance.
 */
export function Committee({ committee }: { committee: CommitteeContent }) {
  const { t } = useLang()

  const { officers, members } = useMemo(
    () => ({
      officers: committee.members.filter((m) => m.office),
      members: committee.members.filter((m) => !m.office),
    }),
    [committee.members],
  )

  return (
    <section id="committee" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Those who serve', ml: 'ശുശ്രൂഷ ചെയ്യുന്നവർ' }}
          title={committee.title}
          subtitle={committee.subtitle}
        />

        <Reveal delay={0.08}>
          <p className="mx-auto mt-8 w-fit rounded-full border border-gold-400/40 px-5 py-2 font-sans text-2xs uppercase tracking-[0.2em] text-gold-600 dark:text-gold-300">
            {t(committee.term)}
          </p>
        </Reveal>

        {officers.length > 0 ? (
          <StaggerGroup className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {officers.map((member) => (
              <motion.div key={member.id} variants={staggerItem}>
                <OfficerCard member={member} />
              </motion.div>
            ))}
          </StaggerGroup>
        ) : null}

        {members.length > 0 ? (
          <StaggerGroup className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {members.map((member) => (
              <motion.div key={member.id} variants={staggerItem}>
                <MemberRow member={member} />
              </motion.div>
            ))}
          </StaggerGroup>
        ) : null}

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-start gap-5 rounded-sm border border-gold-400/30 bg-gold-400/[0.05] p-7 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-gold-400/40 text-gold-600 dark:text-gold-300">
              <Icon name="users" className="h-5 w-5" />
            </span>
            <p className="flex-1 font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
              {t(committee.note)}
            </p>
            <a href="#contact" className="btn-outline shrink-0">
              {t(ui.contact.heading)}
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function OfficerCard({ member }: { member: CommitteeMember }) {
  const { t } = useLang()

  return (
    <article className="card card-hover group flex h-full flex-col">
      <div className="relative overflow-hidden">
        {member.image ? (
          <>
            <SmartImage
              src={member.image}
              alt={t(member.name)}
              width={640}
              height={720}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
              wrapperClassName="aspect-[3/2] w-full sm:aspect-[5/6]"
              className="h-full w-full object-cover grayscale-[0.35] transition-[filter,transform] duration-[1200ms] ease-sacred group-hover:grayscale-0"
              zoom
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/10 to-transparent"
              aria-hidden="true"
            />
          </>
        ) : (
          // No photograph on file. A monogram is honest; a stock face is not.
          <div className="flex aspect-[3/2] w-full items-center justify-center bg-navy-950 sm:aspect-[5/6]">
            <span
              className="font-display text-6xl text-gold-400/60"
              aria-hidden="true"
            >
              {initials(member.name.en)}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="font-display text-lg leading-tight text-white">{t(member.name)}</p>
          <p className="mt-1 font-sans text-[0.6rem] uppercase tracking-[0.18em] text-gold-300">
            {t(member.role)}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="font-sans text-2xs text-[rgb(var(--muted))]">{t(member.unit)}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[rgb(var(--line))] pt-4">
          <span className="font-sans text-[0.6rem] uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
            {t({ en: 'Since', ml: 'മുതൽ' })} {member.since}
          </span>
          {member.phone ? (
            <a
              href={telHref(member.phone)}
              className="-my-2 flex min-h-[40px] items-center gap-1.5 font-sans text-2xs text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
            >
              <Icon name="phone" className="h-3.5 w-3.5" />
              {t(ui.common.call)}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function MemberRow({ member }: { member: CommitteeMember }) {
  const { t } = useLang()

  return (
    <article
      className={cn(
        'card card-hover flex h-full items-center gap-4 p-4',
        'sm:p-5',
      )}
    >
      {member.image ? (
        <SmartImage
          src={member.image}
          alt={t(member.name)}
          width={160}
          height={160}
          sizes="64px"
          rounded
          wrapperClassName="h-14 w-14 shrink-0 rounded-full"
          className="h-full w-full rounded-full object-cover grayscale-[0.4]"
        />
      ) : (
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold-400/40 bg-gold-400/[0.07] font-display text-lg text-gold-600 dark:text-gold-300"
          aria-hidden="true"
        >
          {initials(member.name.en)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base leading-tight text-[rgb(var(--ink))]">
          {t(member.name)}
        </p>
        <p className="mt-1 font-sans text-[0.6rem] uppercase tracking-[0.14em] text-gold-600 dark:text-gold-400">
          {t(member.role)}
        </p>
        <p className="mt-1 truncate font-sans text-2xs text-[rgb(var(--muted))]">{t(member.unit)}</p>
      </div>

      {member.phone ? (
        <a
          href={telHref(member.phone)}
          aria-label={`${t(ui.common.call)} ${t(member.name)}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-[rgb(var(--line))] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 hover:text-gold-500"
        >
          <Icon name="phone" className="h-3.5 w-3.5" />
        </a>
      ) : null}
    </article>
  )
}
