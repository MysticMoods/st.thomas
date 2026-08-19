'use client'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Reveal } from './ui/Reveal'
import { SmartImage } from './ui/SmartImage'

/**
 * A short trail from the homepage to the hall, since that is what most people
 * arrive looking for after Mass timings.
 */
export function HallPromo({ hall }: { hall: HallContent }) {
  const { t, lang } = useLang()
  const from = Math.min(...hall.sessions.map((session) => session.rent))

  return (
    <section id="hall" className="section-tight bg-[rgb(var(--page))]">
      <div className="container">
        <div className="card grid overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SmartImage
            src={hall.image}
            alt={t(hall.title)}
            width={1200}
            height={800}
            zoom
            sizes="(max-width: 1024px) 100vw, 50vw"
            wrapperClassName="aspect-[16/10] w-full lg:aspect-auto lg:h-full"
            className="h-full w-full object-cover"
          />

          <div className="flex flex-col justify-center gap-5 p-8 sm:p-12">
            <span className="eyebrow">{t({ en: 'Hire the hall', ml: 'ഹാൾ വാടകയ്ക്ക്' })}</span>
            <h2 className="heading-md">{t(hall.title)}</h2>
            <span className="gold-rule w-14 opacity-70" aria-hidden="true" />
            <p className="body-text">{t(hall.subtitle)}</p>

            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {hall.facts.slice(0, 3).map((fact) => (
                <li key={t(fact.label)} className="font-sans text-2xs text-[rgb(var(--muted))]">
                  <span className="text-gold-600 dark:text-gold-400">{t(fact.label)}:</span>{' '}
                  {t(fact.value)}
                </li>
              ))}
            </ul>

            <p className="font-sans text-sm text-[rgb(var(--muted))]">
              {t({ en: 'From', ml: 'ആരംഭം' })}{' '}
              <span className="font-display text-2xl text-[rgb(var(--ink))] tabular-nums">
                ₹{formatNumber(from, lang)}
              </span>{' '}
              {t({ en: 'a session · air conditioning and generator available', ml: 'ഒരു സെഷന് · എയർ കണ്ടീഷനിംഗും ജനറേറ്ററും ലഭ്യം' })}
            </p>

            <div className="mt-2 flex flex-wrap gap-3">
              <a href="/hall" className="btn-primary">
                {t({ en: 'See free days', ml: 'ഒഴിവുള്ള ദിവസങ്ങൾ' })}
                <Icon name="arrowRight" className="h-4 w-4" />
              </a>
              <a href="/hall#book" className="btn-outline">
                {t({ en: 'Book the hall', ml: 'ഹാൾ ബുക്ക് ചെയ്യുക' })}
                <Icon name="calendar" className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
