'use client'

import { useLang } from '@/lib/i18n'
import type { ClergyContent } from '@/lib/types'

import { Reveal } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

export function Clergy({ clergy }: { clergy: ClergyContent }) {
  const { t } = useLang()
  const priest = clergy.parishPriest

  return (
    <section id="priests" className="section relative overflow-hidden bg-navy-950 text-stone-100">
      <div className="pointer-events-none grain absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-gold-500/10 blur-[120px]"
        aria-hidden="true"
      />

      <div className="container relative">
        <SectionHeading
          eyebrow={{ en: 'Our Shepherds', ml: 'ഞങ്ങളുടെ ഇടയന്മാർ' }}
          title={{ en: 'The Parish Priest', ml: 'ഇടവക വികാരി' }}
          tone="invert"
        />

        {/* The photograph and the name only. The quote, the letter and the
            contact buttons are kept in clergy.json but not shown. */}
        <div className="mt-16 flex justify-center">
          <Reveal className="w-full max-w-sm">
            <figure className="relative mx-auto w-full max-w-sm">
              {/* the gold rule sits outside the frame, so it stays unclipped */}
              <div
                className="absolute -inset-3 rounded-lg border border-gold-400/25"
                aria-hidden="true"
              />
              <div className="relative overflow-hidden rounded-sm">
                <SmartImage
                  src={priest.image}
                  alt={t(priest.name)}
                  width={900}
                  height={1125}
                  sizes="(max-width: 640px) 90vw, 400px"
                  wrapperClassName="aspect-[4/5] w-full"
                  className="h-full w-full object-cover"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950 via-navy-950/80 to-transparent p-6 pt-16 text-center">
                  <p className="font-display text-2xl text-white">{t(priest.name)}</p>
                  <p className="mt-1 font-sans text-2xs uppercase tracking-[0.24em] text-gold-300">
                    {t(priest.designation)}
                  </p>
                  {t(priest.since).trim() ? (
                    <p className="mt-2 font-sans text-xs text-stone-300/75">{t(priest.since)}</p>
                  ) : null}
                </figcaption>
              </div>
            </figure>
          </Reveal>

        </div>
      </div>
    </section>
  )
}
