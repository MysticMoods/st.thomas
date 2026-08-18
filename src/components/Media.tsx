'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { MediaContent } from '@/lib/types'
import { formatDate } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Reveal, StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

export function Media({ media }: { media: MediaContent }) {
  const { t, lang } = useLang()
  const featured = media.videos.find((v) => v.featured) ?? media.videos[0]
  const rest = media.videos.filter((v) => v.id !== featured?.id)
  const [playing, setPlaying] = useState(false)

  if (!featured) return null

  return (
    <section id="media" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Parish Media', ml: 'ഇടവക മീഡിയ' }}
          title={media.title}
          subtitle={media.subtitle}
        />

        <div className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12">
          {/* featured video — facade loads YouTube only after a click */}
          <Reveal>
            <div>
              <div className="group relative aspect-video w-full overflow-hidden rounded-sm border border-[rgb(var(--line))] bg-navy-950">
                {playing ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${featured.id}?autoplay=1&rel=0`}
                    title={t(featured.title)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    className="absolute inset-0 h-full w-full"
                    aria-label={`${t(ui.common.playVideo)}: ${t(featured.title)}`}
                  >
                    <Image
                      src={thumb(featured.id)}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-cover transition-transform duration-[1200ms] ease-sacred group-hover:scale-105"
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-navy-950/30"
                      aria-hidden="true"
                    />
                    <span className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold-300/60 bg-navy-950/50 text-gold-200 backdrop-blur-sm transition-all duration-500 ease-sacred group-hover:scale-110 group-hover:border-gold-300 group-hover:bg-gold-400 group-hover:text-navy-950">
                      <Icon name="play" filled className="ml-1 h-7 w-7" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-6 text-left">
                      <span className="rounded-sm bg-burgundy-600 px-2.5 py-1 font-sans text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white">
                        {t({ en: 'Latest', ml: 'പുതിയത്' })}
                      </span>
                      <span className="font-sans text-2xs tabular-nums text-stone-300">
                        {featured.duration}
                      </span>
                    </span>
                  </button>
                )}
              </div>

              <h3 className="mt-7 font-display text-2xl leading-snug text-[rgb(var(--ink))] sm:text-3xl">
                {t(featured.title)}
              </h3>
              <p className="mt-3 font-sans text-sm text-[rgb(var(--muted))]">
                {t(featured.description)}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="flex items-center gap-2 font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  <Icon name="calendar" className="h-3.5 w-3.5 text-gold-500" />
                  {formatDate(featured.published, lang)}
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${featured.id}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 font-sans text-2xs font-semibold uppercase tracking-[0.16em] text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
                >
                  <Icon name="youtube" className="h-4 w-4" />
                  {t(ui.common.watchOnYoutube)}
                </a>
              </div>
            </div>
          </Reveal>

          {/* playlist + bulletins */}
          <div className="flex min-w-0 flex-col gap-10">
            <StaggerGroup className="flex min-w-0 flex-col gap-3">
              {rest.map((video) => (
                <motion.a
                  key={video.id}
                  variants={staggerItem}
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex gap-4 rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-3 transition-all duration-500 ease-sacred hover:-translate-y-0.5 hover:border-gold-300/70 hover:shadow-sacred"
                >
                  <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-md bg-navy-900 sm:w-36">
                    <Image
                      src={thumb(video.id)}
                      alt=""
                      fill
                      sizes="150px"
                      className="object-cover transition-transform duration-700 ease-sacred group-hover:scale-110"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-navy-950/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <Icon name="play" filled className="h-6 w-6 text-white" />
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-col justify-center gap-1.5">
                    <span className="line-clamp-2 font-serif text-[1.05rem] leading-snug text-[rgb(var(--ink))]">
                      {t(video.title)}
                    </span>
                    <span className="flex items-center gap-3 font-sans text-2xs text-[rgb(var(--muted))]">
                      <span className="tabular-nums">{formatDate(video.published, lang)}</span>
                      <span className="tabular-nums">{video.duration}</span>
                    </span>
                  </span>
                </motion.a>
              ))}
            </StaggerGroup>

            <Reveal delay={0.1}>
              <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-7">
                <h4 className="flex items-center gap-2.5 font-display text-xl text-[rgb(var(--ink))]">
                  <Icon name="file" className="h-5 w-5 text-gold-500" />
                  {t({ en: 'Parish Bulletins', ml: 'ഇടവക ബുള്ളറ്റിനുകൾ' })}
                </h4>
                <ul className="mt-5 divide-y divide-[rgb(var(--line))]">
                  {media.bulletins.map((bulletin) => (
                    <li key={bulletin.id}>
                      <a
                        href={bulletin.file}
                        download
                        className="group flex items-center justify-between gap-4 py-3.5 transition-colors"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-sans text-sm text-[rgb(var(--ink))] transition-colors group-hover:text-gold-600 dark:group-hover:text-gold-300">
                            {t(bulletin.title)}
                          </span>
                          <span className="font-sans text-2xs text-[rgb(var(--muted))]">
                            PDF · {bulletin.size}
                          </span>
                        </span>
                        <Icon
                          name="download"
                          className="h-4 w-4 shrink-0 text-[rgb(var(--muted))] transition-colors group-hover:text-gold-500"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 border-t border-[rgb(var(--line))] pt-4 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                  {t(media.channel.note)}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
