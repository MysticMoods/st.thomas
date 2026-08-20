'use client'

import { motion } from 'framer-motion'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

import { Icon, type IconName } from '../ui/Icon'
import { StaggerGroup, staggerItem } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'

/** A face for each of the things that carry a charge. */
const ICONS: Record<string, IconName> = {
  ac: 'sun',
  generator: 'flame',
  sound: 'music',
  projector: 'play',
  kitchen: 'hands',
  chairs: 'users',
  decoration: 'rose',
  cleaning: 'sparkle',
}

/**
 * Section 04 — what comes with the hall and what is added to the bill, side by
 * side, so nobody discovers the second half on the day.
 */
export function HallFacilities({ hall }: { hall: HallContent }) {
  const { t, lang } = useLang()

  return (
    <section id="facilities" className="hall-anchor section-tight bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: '04 · What is included', ml: '04 · ഉൾപ്പെടുന്നത്' }}
          title={{ en: 'Everything the hall comes with', ml: 'ഹാളിനൊപ്പം ലഭിക്കുന്നതെല്ലാം' }}
          subtitle={{
            en: 'The first list is in the rent. The second is arranged by the parish for the rate shown, and only what you tick is charged.',
            ml: 'ആദ്യത്തെ പട്ടിക വാടകയിൽ ഉൾപ്പെടും. രണ്ടാമത്തേത് കാണിച്ചിരിക്കുന്ന നിരക്കിൽ ഇടവക ക്രമീകരിക്കും — തിരഞ്ഞെടുക്കുന്നതിന് മാത്രമേ നിരക്കുള്ളൂ.',
          }}
        />

        {/* in the rent */}
        <h3 className="mt-16 font-sans text-2xs uppercase tracking-[0.2em] text-gold-600 dark:text-gold-400">
          {t({ en: 'In the rent, at no extra charge', ml: 'വാടകയിൽ, അധിക നിരക്കില്ലാതെ' })}
        </h3>
        <StaggerGroup className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hall.included.map((item) => (
            <motion.div
              key={item.label.en}
              variants={staggerItem}
              className="flex gap-3 rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-5"
            >
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
              <span className="min-w-0">
                <span className="block font-sans text-[0.95rem] leading-snug text-[rgb(var(--ink))]">
                  {t(item.label)}
                </span>
                <span className="mt-1 block font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                  {t(item.note)}
                </span>
              </span>
            </motion.div>
          ))}
        </StaggerGroup>

        {/* on request */}
        <h3 className="mt-14 font-sans text-2xs uppercase tracking-[0.2em] text-gold-600 dark:text-gold-400">
          {t({ en: 'Arranged on request', ml: 'ആവശ്യപ്പെട്ടാൽ ക്രമീകരിക്കും' })}
        </h3>
        <StaggerGroup className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {hall.amenities.map((amenity) => (
            <motion.div
              key={amenity.id}
              variants={staggerItem}
              className="card card-hover flex flex-col p-5"
            >
              <Icon
                name={ICONS[amenity.id] ?? 'sparkle'}
                className="h-6 w-6 text-gold-500"
              />
              <span className="mt-4 font-serif text-lg leading-snug text-[rgb(var(--ink))]">
                {t(amenity.label)}
              </span>
              <span className="mt-1 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                {t(amenity.note)}
              </span>
              <span className="mt-4 border-t border-[rgb(var(--line))] pt-3 font-sans text-sm tabular-nums text-gold-600 dark:text-gold-400">
                ₹{formatNumber(amenity.rate, lang)}
              </span>
            </motion.div>
          ))}
        </StaggerGroup>

        <p className="mt-8 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
          {t({
            en: 'The small hall has no air conditioning and no generator, so those two do not appear on its form.',
            ml: 'ചെറിയ ഹാളിൽ എയർ കണ്ടീഷനിംഗോ ജനറേറ്ററോ ഇല്ല — അതിന്റെ ഫോമിൽ അവ രണ്ടും വരില്ല.',
          })}
        </p>
      </div>
    </section>
  )
}
