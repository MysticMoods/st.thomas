'use client'

import Image from 'next/image'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { telHref } from '@/lib/utils'

import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'

/** The closing band: one date, one telephone number, nothing else to read. */
export function HallCta({ hall }: { hall: HallContent }) {
  const { t } = useLang()

  return (
    <section className="relative overflow-hidden py-24 md:py-32">
      <Image
        src={hall.hero.images[0] ?? hall.image}
        alt=""
        fill
        quality={80}
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-navy-950/90" aria-hidden="true" />
      <div className="grain absolute inset-0" aria-hidden="true" />

      <div className="container relative text-center">
        <Reveal>
          <span className="eyebrow text-gold-300">
            {t({ en: 'The next step', ml: 'അടുത്ത ചുവട്' })}
          </span>
        </Reveal>

        <Reveal delay={0.06}>
          <h2 className="heading-lg mt-5 text-white">
            {t({ en: 'Let us find your date', ml: 'നിങ്ങളുടെ ദിവസം കണ്ടെത്താം' })}
          </h2>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="lede mx-auto mt-6 max-w-2xl text-stone-200/85">
            {t({
              en: 'Send the request from the calendar above, or ring the parish office and someone will look at the diary with you.',
              ml: 'മുകളിലെ കലണ്ടറിൽ നിന്ന് അപേക്ഷ അയയ്ക്കുക, അല്ലെങ്കിൽ ഇടവക ഓഫീസിലേക്ക് വിളിക്കുക — ആരെങ്കിലും നിങ്ങളോടൊപ്പം ഡയറി നോക്കും.',
            })}
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a href="#book" className="btn-primary">
              {t({ en: 'Check a date', ml: 'ഒരു ദിവസം നോക്കുക' })}
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
            <a href={telHref(hall.booking.contact.phone)} className="btn-ghost">
              <Icon name="phone" className="h-4 w-4" />
              {hall.booking.contact.phone}
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <p className="mt-8 font-sans text-2xs uppercase tracking-[0.16em] text-stone-300/70">
            {t(hall.booking.contact.hours)}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
