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
  // The cheapest way into any of the halls, for the headline price.
  const from = Math.min(...hall.halls.flatMap((room) => Object.values(room.rates)))
  const rooms = hall.halls.filter((room) => !room.combines?.length)

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

            <ul className="flex flex-col gap-1.5">
              {rooms.map((room) => (
                <li key={room.id} className="font-sans text-2xs text-[rgb(var(--muted))]">
                  <span className="text-gold-600 dark:text-gold-400">{t(room.name)}:</span>{' '}
                  {room.seated} {t({ en: 'seated', ml: 'ഇരുന്ന്' })}
                  {room.features.ac ? ` · ${t({ en: 'AC', ml: 'എസി' })}` : ''}
                  {room.features.generator ? ` · ${t({ en: 'generator', ml: 'ജനറേറ്റർ' })}` : ''}
                  {room.features.stage ? ` · ${t({ en: 'stage', ml: 'വേദി' })}` : ''}
                </li>
              ))}
            </ul>

            <p className="font-sans text-sm text-[rgb(var(--muted))]">
              {t({ en: 'From', ml: 'ആരംഭം' })}{' '}
              <span className="font-display text-2xl text-[rgb(var(--ink))] tabular-nums">
                ₹{formatNumber(from, lang)}
              </span>{' '}
              {t({ en: 'a session · the two large halls can be taken together', ml: 'ഒരു സെഷന് · രണ്ട് വലിയ ഹാളുകൾ ഒരുമിച്ച് എടുക്കാം' })}
            </p>

            <div className="mt-2 flex flex-wrap gap-3">
              <a href="/hall" className="btn-primary">
                {t({ en: 'See the halls', ml: 'ഹാളുകൾ കാണുക' })}
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
