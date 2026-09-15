'use client'

import { useState } from 'react'

import { useLang } from '@/lib/i18n'
import { memorialSlug } from '@/lib/slug'
import type { L, Obituary } from '@/lib/types'
import { formatDate, formatNumber } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Reveal } from './ui/Reveal'
import { SmartImage } from './ui/SmartImage'

/**
 * One person, on a page of their own.
 *
 * Quieter than the archive it came from: no filters, no grid, nothing to click
 * except the way back. The share button is the reason the page exists — a
 * family wanting to send this to relations abroad should not have to send them
 * a link to a list.
 */
export function Memorial({ person, prayer }: { person: Obituary; prayer: L }) {
  const { t, lang } = useLang()
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/obituary/${memorialSlug(person)}`
    const title = `${t(person.name)} · ${person.born.slice(0, 4)}–${person.died.slice(0, 4)}`

    // The native sheet where there is one — that is what puts it into WhatsApp,
    // which is where these actually travel.
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url })
        return
      } catch {
        /* dismissed, or refused — fall through to copying */
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2600)
    } catch {
      /* nothing more can be done from here */
    }
  }

  return (
    <article className="section-first bg-[rgb(var(--page))]">
      <div className="container">
        <a
          href="/obituary"
          className="inline-flex items-center gap-2 font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))] transition-colors hover:text-gold-500"
        >
          <Icon name="chevronLeft" className="h-3.5 w-3.5" />
          {t({ en: 'The obituary column', ml: 'ചരമ പംക്തി' })}
        </a>

        <div className="mx-auto mt-10 grid max-w-4xl gap-10 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] sm:gap-12">
          <Reveal>
            <div className="overflow-hidden rounded-sm border border-[rgb(var(--line))]">
              <SmartImage
                src={person.image}
                alt={t(person.name)}
                width={640}
                height={800}
                priority
                sizes="(min-width: 640px) 40vw, 100vw"
                wrapperClassName="aspect-[4/5] w-full"
                className="h-full w-full object-cover saturate-[0.72]"
              />
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
              {t({ en: 'In loving memory', ml: 'സ്നേഹ സ്മരണയിൽ' })}
            </p>

            <h1 className="heading-lg mt-4 text-[rgb(var(--ink))]">{t(person.name)}</h1>

            <p className="mt-3 font-serif text-lg text-[rgb(var(--muted))] tabular-nums">
              {formatDate(person.born, lang)} — {formatDate(person.died, lang)}
              <span className="mt-1 block font-sans text-2xs uppercase tracking-[0.14em]">
                {formatNumber(person.age, lang)} {t({ en: 'years', ml: 'വയസ്സ്' })}
              </span>
            </p>

            <span className="mt-6 block gold-rule" aria-hidden="true" />

            <dl className="mt-7 divide-y divide-[rgb(var(--line))] border-y border-[rgb(var(--line))]">
              {[
                { label: { en: 'House', ml: 'ഭവനം' }, value: t(person.house) },
                { label: { en: 'Family unit', ml: 'കുടുംബക്കൂട്ടായ്മ' }, value: t(person.unit) },
                person.funeral
                  ? {
                      label: { en: 'Funeral', ml: 'സംസ്കാരം' },
                      value: `${formatDate(person.funeral.date, lang)} · ${t(person.funeral.time)} · ${t(person.funeral.place)}`,
                    }
                  : null,
              ]
                .filter((row): row is { label: L; value: string } => Boolean(row?.value))
                .map((row) => (
                  <div key={row.label.en} className="flex flex-wrap gap-x-6 gap-y-1 py-3.5">
                    <dt className="w-32 shrink-0 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
                      {t(row.label)}
                    </dt>
                    <dd className="min-w-0 flex-1 font-sans text-[0.95rem] text-[rgb(var(--ink))]">
                      {row.value}
                    </dd>
                  </div>
                ))}
            </dl>

            <button
              type="button"
              onClick={share}
              className="btn-primary mt-8"
            >
              {copied
                ? t({ en: 'Link copied', ml: 'ലിങ്ക് പകർത്തി' })
                : t({ en: 'Share this memorial', ml: 'ഈ സ്മരണ പങ്കിടുക' })}
              <Icon name={copied ? 'check' : 'arrowRight'} className="h-4 w-4" />
            </button>
          </Reveal>
        </div>

        {t(person.survivedBy) ? (
          <Reveal delay={0.12}>
            <p className="mx-auto mt-12 max-w-3xl border-t border-[rgb(var(--line))] pt-8 font-sans text-[1.05rem] leading-relaxed text-[rgb(var(--muted))]">
              {t(person.survivedBy)}
            </p>
          </Reveal>
        ) : null}

        {t(person.tribute) ? (
          <Reveal delay={0.16}>
            <blockquote className="mx-auto mt-8 max-w-3xl border-l-2 border-gold-400/60 pl-6">
              <p className="font-serif text-xl italic leading-relaxed text-[rgb(var(--ink))]">
                {t(person.tribute)}
              </p>
            </blockquote>
          </Reveal>
        ) : null}

        <Reveal delay={0.2}>
          <p className="mx-auto mt-14 max-w-2xl border-t border-[rgb(var(--line))] pt-8 text-center font-serif text-lg italic leading-relaxed text-[rgb(var(--muted))]">
            {t(prayer)}
          </p>
        </Reveal>
      </div>
    </article>
  )
}
