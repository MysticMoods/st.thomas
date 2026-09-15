'use client'

import { useLang } from '@/lib/i18n'
import type { OfficeContent, SiteContent } from '@/lib/types'
import { telHref } from '@/lib/utils'

import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'
import { SmartImage } from '../ui/SmartImage'

/** The opening of the parish office page, and the three things it can do. */
export function OfficeIntro({ office, site }: { office: OfficeContent; site: SiteContent }) {
  const { t } = useLang()

  const doors = [
    {
      href: '#intentions',
      icon: 'candle' as const,
      title: office.intentions.title,
      blurb: { en: 'For the dead, in thanksgiving, or for anyone in need of prayer', ml: 'മരിച്ചവർക്ക്, നന്ദിയർപ്പണത്തിന്, പ്രാർത്ഥന വേണ്ടവർക്ക്' },
    },
    {
      href: '#certificates',
      icon: 'scroll' as const,
      title: office.certificates.title,
      blurb: { en: 'Baptism, confirmation, marriage, death, membership', ml: 'ജ്ഞാനസ്നാനം, സ്ഥൈര്യലേപനം, വിവാഹം, മരണം, അംഗത്വം' },
    },
    {
      href: '#prayers',
      icon: 'hands' as const,
      title: office.prayers.title,
      blurb: { en: 'Read by the priest and the prayer group, and nobody else', ml: 'വൈദികനും പ്രാർത്ഥനാ സംഘവും മാത്രം വായിക്കുന്നു' },
    },
  ]

  return (
    <section className="section-first bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'The parish office', ml: 'ഇടവക ഓഫീസ്' }}
          title={office.title}
          subtitle={office.subtitle}
          level={1}
        />

        <Reveal>
          <div className="mt-12 overflow-hidden rounded-sm">
            <SmartImage
              src={office.image}
              alt=""
              width={1440}
              height={640}
              priority
              sizes="100vw"
              wrapperClassName="aspect-[21/9] w-full"
              className="h-full w-full object-cover"
            />
          </div>
        </Reveal>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {doors.map((door) => (
            <a
              key={door.href}
              href={door.href}
              className="card card-hover flex flex-col p-6"
            >
              <Icon name={door.icon} className="h-6 w-6 text-gold-500" />
              <span className="mt-4 font-serif text-lg leading-snug text-[rgb(var(--ink))]">
                {t(door.title)}
              </span>
              <span className="mt-2 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                {t(door.blurb)}
              </span>
            </a>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-[rgb(var(--line))] pt-8 text-center">
          <p className="font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
            {t(office.hours)}
          </p>
          <a
            href={telHref(site.contact.office)}
            className="inline-flex items-center gap-2 font-sans text-2xs uppercase tracking-[0.16em] text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
          >
            <Icon name="phone" className="h-3.5 w-3.5" />
            {site.contact.office}
          </a>
        </div>
      </div>
    </section>
  )
}
