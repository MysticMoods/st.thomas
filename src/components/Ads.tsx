'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { Ad, AdPlace, AdsContent } from '@/lib/types'
import { cn } from '@/lib/utils'
import { youtubeId, youtubeThumb } from '@/lib/youtube'

import { Icon } from './ui/Icon'
import { Reveal, StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SmartImage } from './ui/SmartImage'

/**
 * The advertisements at the foot of the page.
 *
 * The printed bulletin has carried the shops around the church for years and
 * paid for itself doing it; this is the same page of the bulletin. Two kinds,
 * because two kinds are what advertisers send: a photograph, or something
 * already on YouTube.
 *
 * A video is a still picture until it is clicked. Nothing is fetched from
 * YouTube before that, so reading the parish notices does not quietly report
 * the visit to Google — the same facade the media section uses.
 *
 * The same list serves the homepage and the hall page. Which advertisements
 * appear where is the advertiser's own `places`, so the office keeps one list
 * rather than two that drift apart.
 */

/** An advertisement that has been switched off, or whose space has run out. */
function running(ad: Ad, today: string) {
  if (ad.active === false) return false
  if (!ad.until?.trim()) return true
  return ad.until.trim() >= today
}

/** Whether this advertisement was bought for the page being read. */
function shows(ad: Ad, place: AdPlace) {
  return !ad.places?.length || ad.places.includes(place)
}

export function Ads({ ads, place = 'home' }: { ads: AdsContent; place?: AdPlace }) {
  const { t } = useLang()

  // Compared as text: both sides are YYYY-MM-DD, which sorts correctly, and it
  // keeps the parish's own day rather than the visitor's timezone.
  const today = new Date().toISOString().slice(0, 10)
  const showing = (ads.items ?? []).filter((ad) => running(ad, today) && shows(ad, place))

  // The hall page may word this its own way; anything it does not say falls
  // back to the wording the homepage uses.
  const override = place === 'hall' ? ads.hall : undefined
  const heading = {
    title: override?.title ?? ads.title,
    subtitle: override?.subtitle ?? ads.subtitle,
    note: override?.note ?? ads.note,
    contactHref: override?.contactHref ?? ads.contactHref,
  }

  // Nothing sold this month is not an error. The section simply is not there.
  if (showing.length === 0) return null

  return (
    <section id="ads" className="section-tight border-t border-[rgb(var(--line))] bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Advertisement', ml: 'പരസ്യം' }}
          title={heading.title}
          subtitle={heading.subtitle}
        />

        <StaggerGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {showing.map((ad) => (
            <motion.div key={ad.id} variants={staggerItem}>
              <AdPanel ad={ad} />
            </motion.div>
          ))}
        </StaggerGroup>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col items-start gap-5 rounded-sm border border-gold-400/30 bg-gold-400/[0.05] p-7 sm:flex-row sm:items-center sm:gap-8">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-gold-400/40 text-gold-600 dark:text-gold-300">
              <Icon name="megaphone" className="h-5 w-5" />
            </span>
            <p className="flex-1 font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
              {t(heading.note)}
            </p>
            {heading.contactHref ? (
              <a href={heading.contactHref} className="btn-outline shrink-0">
                {t(ui.contact.heading)}
                <Icon name="arrowRight" className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function AdPanel({ ad }: { ad: Ad }) {
  const { t } = useLang()
  const [playing, setPlaying] = useState(false)

  const video = ad.kind === 'video' ? youtubeId(ad.video ?? '') : ''

  // A video row with an address YouTube does not recognise, or a picture row
  // with no picture, would draw an empty grey box. Leave the space instead.
  if (ad.kind === 'video' ? !video : !ad.image?.trim()) return null

  const frame = (
    <div className="relative aspect-video w-full overflow-hidden bg-navy-950">
      {video ? (
        playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0`}
            title={t(ad.title)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group/play absolute inset-0 h-full w-full"
            aria-label={`${t(ui.common.playVideo)}: ${t(ad.title)}`}
          >
            <Image
              src={youtubeThumb(video)}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              className="object-cover transition-transform duration-[1200ms] ease-sacred group-hover/play:scale-105"
            />
            <span className="absolute inset-0 grid place-items-center bg-navy-950/25 transition-colors group-hover/play:bg-navy-950/10">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-white/70 bg-navy-950/50 text-white backdrop-blur-sm">
                <Icon name="play" className="ml-0.5 h-5 w-5" />
              </span>
            </span>
          </button>
        )
      ) : (
        <SmartImage
          src={ad.image as string}
          alt={t(ad.title)}
          width={800}
          height={450}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
          wrapperClassName="absolute inset-0 h-full w-full"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )

  const caption = (
    <div className="flex flex-1 flex-col gap-1 p-5">
      <p className="font-display text-base leading-tight text-[rgb(var(--ink))]">{t(ad.title)}</p>
      {ad.caption ? (
        <p className="font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
          {t(ad.caption)}
        </p>
      ) : null}
    </div>
  )

  const shell = cn('card flex h-full flex-col overflow-hidden', ad.href && 'card-hover')

  // A link only when there is somewhere to go, and never wrapped around the
  // video — a click there is meant to start it playing, not leave the site.
  if (ad.href?.trim() && !video) {
    return (
      <a
        href={ad.href}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className={cn(shell, 'group')}
      >
        {frame}
        {caption}
      </a>
    )
  }

  return (
    <article className={shell}>
      {frame}
      {ad.href?.trim() && video ? (
        <div className="flex flex-1 flex-col justify-between gap-3 p-5">
          <div className="flex flex-col gap-1">
            <p className="font-display text-base leading-tight text-[rgb(var(--ink))]">
              {t(ad.title)}
            </p>
            {ad.caption ? (
              <p className="font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                {t(ad.caption)}
              </p>
            ) : null}
          </div>
          <a
            href={ad.href}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="mt-auto inline-flex items-center gap-1.5 font-sans text-2xs uppercase tracking-[0.14em] text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
          >
            {t({ en: 'Visit', ml: 'സന്ദർശിക്കുക' })}
            <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        caption
      )}
    </article>
  )
}
