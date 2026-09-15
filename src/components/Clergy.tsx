'use client'

import { ui, useLang } from '@/lib/i18n'
import type { ClergyContent } from '@/lib/types'
import { telHref } from '@/lib/utils'

import { Icon } from './ui/Icon'
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

        <div className="mt-20 grid items-center gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-20">
          <Reveal direction="right">
            <figure className="relative mx-auto max-w-sm">
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
                  sizes="(max-width: 1024px) 80vw, 32vw"
                  wrapperClassName="aspect-[4/5] w-full"
                  className="h-full w-full object-cover grayscale-[0.15]"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950 via-navy-950/80 to-transparent p-6 pt-16 text-center">
                  <p className="font-display text-2xl text-white">{t(priest.name)}</p>
                  <p className="mt-1 font-sans text-2xs uppercase tracking-[0.24em] text-gold-300">
                    {t(priest.designation)}
                  </p>
                  <p className="mt-2 font-sans text-xs text-stone-300/75">{t(priest.since)}</p>
                </figcaption>
              </div>
            </figure>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <div>
              <Icon name="quote" filled className="h-9 w-9 text-gold-400/70" />
              <blockquote className="mt-5 font-serif text-2xl italic leading-relaxed text-stone-100 sm:text-3xl">
                {t(priest.quote)}
              </blockquote>

              <div className="mt-9 h-px w-full bg-gradient-to-r from-gold-400/50 to-transparent" />

              <p className="mt-9 font-sans text-[0.98rem] leading-[1.85] text-stone-300/90">
                {t(priest.message)}
              </p>

              {/* an empty signature would print a lone em dash under the message */}
              {t(priest.signature).trim() ? (
                <p className="mt-7 font-display text-xl text-gold-200">— {t(priest.signature)}</p>
              ) : (
                <p className="mt-7 font-display text-xl text-gold-200">— {t(priest.name)}</p>
              )}

              <div className="mt-10 flex flex-wrap gap-3">
                <a href={telHref(priest.phone)} className="btn-ghost">
                  <Icon name="phone" className="h-4 w-4" />
                  {priest.phone}
                </a>
                <a href={`mailto:${priest.email}`} className="btn-ghost">
                  <Icon name="mail" className="h-4 w-4" />
                  {t(ui.common.email)}
                </a>
                <a
                  href={`https://wa.me/${priest.whatsapp}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn-ghost"
                >
                  <Icon name="whatsapp" className="h-4 w-4" />
                  {t(ui.common.whatsapp)}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
