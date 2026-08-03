'use client'

import Link from 'next/link'

import { ui, useLang } from '@/lib/i18n'
import type { MassContent, NoticesContent, SiteContent } from '@/lib/types'
import { formatDate, telHref } from '@/lib/utils'

import { SocialRow } from './SocialRow'
import { Icon } from './ui/Icon'
import { ParishEmblem } from './ui/ParishEmblem'

const QUICK_LINKS = [
  { id: 'about', label: ui.nav.about },
  { id: 'mass-timings', label: ui.nav.mass },
  { id: 'weekly-events', label: ui.nav.events },
  { id: 'priests', label: ui.nav.priests },
  { id: 'gallery', label: ui.nav.gallery },
  { id: 'notices', label: ui.nav.notices },
  { id: 'members', label: ui.nav.members },
  { id: 'contact', label: ui.nav.contact },
]

export function Footer({
  site,
  mass,
  notices,
}: {
  site: SiteContent
  mass: MassContent
  notices: NoticesContent
}) {
  const { t, lang } = useLang()
  const sunday = mass.groups.find((g) => g.id === 'sunday') ?? mass.groups[0]
  const latest = [...notices.items].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const year = new Date().getFullYear()

  return (
    <footer className="no-print relative overflow-hidden bg-navy-950 text-stone-300">
      <div className="grain absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="h-px w-full bg-gold-line opacity-70" aria-hidden="true" />

      <div className="container relative py-20">
        <div className="grid gap-12 lg:grid-cols-4 lg:gap-10">
          {/* identity */}
          <div className="lg:col-span-1">
            <ParishEmblem variant="gold" className="h-16 w-16" />
            <h3 className="mt-6 font-display text-2xl leading-tight text-white">
              {t(site.parish.name)}
            </h3>
            <p className="mt-1.5 font-sans text-2xs uppercase tracking-[0.28em] text-gold-400">
              {t(site.parish.place)}
            </p>
            <p className="mt-6 font-sans text-sm leading-relaxed text-stone-400">
              {t(site.contact.address)}
            </p>
            <div className="mt-6 flex flex-col gap-2 font-sans text-sm">
              <a
                href={telHref(site.contact.phone)}
                className="flex items-center gap-2.5 text-stone-300 transition-colors hover:text-gold-300"
              >
                <Icon name="phone" className="h-4 w-4 text-gold-500/80" />
                {site.contact.phone}
              </a>
              <a
                href={`mailto:${site.contact.email}`}
                className="flex items-center gap-2.5 break-all text-stone-300 transition-colors hover:text-gold-300"
              >
                <Icon name="mail" className="h-4 w-4 text-gold-500/80" />
                {site.contact.email}
              </a>
            </div>
          </div>

          {/* quick links */}
          <nav aria-label="Footer">
            <h4 className="font-sans text-2xs uppercase tracking-[0.24em] text-gold-400">
              {t(ui.footer.quickLinks)}
            </h4>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-1">
              {QUICK_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    className="font-sans text-sm text-stone-400 transition-colors hover:text-gold-200"
                  >
                    {t(link.label)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* sunday timings */}
          <div>
            <h4 className="font-sans text-2xs uppercase tracking-[0.24em] text-gold-400">
              {t(ui.footer.massTimings)}
            </h4>
            <ul className="mt-6 flex flex-col gap-3">
              {sunday?.entries.map((entry) => (
                <li key={entry.time} className="flex gap-3 font-sans text-sm">
                  <span className="w-20 shrink-0 tabular-nums text-gold-300">{entry.time}</span>
                  <span className="text-stone-400">{t(entry.label)}</span>
                </li>
              ))}
            </ul>
            <a
              href="#mass-timings"
              className="mt-5 inline-flex items-center gap-2 font-sans text-2xs uppercase tracking-[0.16em] text-gold-400 transition-colors hover:text-gold-200"
            >
              {t(ui.common.viewAll)}
              <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* latest notices */}
          <div>
            <h4 className="font-sans text-2xs uppercase tracking-[0.24em] text-gold-400">
              {t(ui.footer.latestNotices)}
            </h4>
            <ul className="mt-6 flex flex-col gap-4">
              {latest.map((notice) => (
                <li key={notice.id}>
                  <a href="#notices" className="group block">
                    <span className="block font-sans text-2xs tabular-nums text-stone-500">
                      {formatDate(notice.date, lang, { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="mt-1 block font-serif text-[1.02rem] leading-snug text-stone-300 transition-colors group-hover:text-gold-200">
                      {t(notice.title)}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* social + newsletter pointer */}
        <div className="mt-16 flex flex-col gap-8 border-t border-white/10 pt-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="font-sans text-2xs uppercase tracking-[0.24em] text-gold-400">
              {t(ui.footer.followUs)}
            </h4>
            <SocialRow social={site.social} tone="invert" className="mt-4" />
          </div>

          <a
            href="#newsletter"
            className="group flex items-center gap-4 rounded-sm border border-white/10 px-6 py-5 transition-colors hover:border-gold-400/50"
          >
            <Icon name="mail" className="h-5 w-5 text-gold-400" />
            <span>
              <span className="block font-display text-lg text-white">
                {t(site.newsletter.title)}
              </span>
              <span className="block font-sans text-2xs text-stone-400">
                {t(ui.newsletter.privacy)}
              </span>
            </span>
            <Icon
              name="arrowRight"
              className="h-4 w-4 text-gold-400 transition-transform duration-300 group-hover:translate-x-1"
            />
          </a>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 font-sans text-2xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {t(site.parish.name)}, {t(site.parish.place)}. {t(ui.footer.rights)}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-gold-300">
              {t(ui.footer.privacy)}
            </Link>
            <Link href="/credits" className="transition-colors hover:text-gold-300">
              {t(ui.footer.credits)}
            </Link>
            <Link href="/admin" className="transition-colors hover:text-gold-300">
              {t(ui.footer.admin)}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
