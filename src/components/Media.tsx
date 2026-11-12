'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRef, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { MediaContent } from '@/lib/types'
import { formatDate } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { Reveal, StaggerGroup, staggerItem } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

/** How many of the older videos show before "Show all" — two full rows on a laptop. */
const FIRST_SHOWN = 8

type Video = MediaContent['videos'][number]

export function Media({ media }: { media: MediaContent }) {
  const { t, lang } = useLang()
  const featured = media.videos.find((v) => v.featured) ?? media.videos[0]
  const [current, setCurrent] = useState<Video | undefined>(featured)
  const [playing, setPlaying] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const player = useRef<HTMLDivElement>(null)

  if (!featured || !current) return null

  // Everything but the one in the player, newest first as the content keeps it.
  const others = media.videos.filter((v) => v.id !== current.id)
  const shown = showAll ? others : others.slice(0, FIRST_SHOWN)

  /** A video picked from the grid plays here, on the parish's own page. */
  function play(video: Video) {
    setCurrent(video)
    setPlaying(true)
    player.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section id="media" className="section bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Parish Media', ml: 'ഇടവക മീഡിയ' }}
          title={media.title}
          subtitle={media.subtitle}
        />

        <div className="mt-16 grid gap-10 lg:mt-20 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-12">
          {/* the player — a facade that loads YouTube only after a click */}
          <Reveal>
            <div ref={player} className="scroll-mt-32">
              <div className="group relative aspect-video w-full overflow-hidden rounded-sm border border-[rgb(var(--line))] bg-navy-950 shadow-sacred">
                {playing ? (
                  <iframe
                    key={current.id}
                    src={`https://www.youtube-nocookie.com/embed/${current.id}?autoplay=1&rel=0`}
                    title={t(current.title)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    className="absolute inset-0 h-full w-full"
                    aria-label={`${t(ui.common.playVideo)}: ${t(current.title)}`}
                  >
                    <Image
                      src={thumb(current.id)}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      className="object-cover transition-transform duration-[1200ms] ease-sacred group-hover:scale-105"
                    />
                    <span
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/15 to-navy-950/25"
                      aria-hidden="true"
                    />
                    <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-gold-300/60 bg-navy-950/55 text-gold-200 backdrop-blur-sm transition-all duration-500 ease-sacred group-hover:scale-110 group-hover:border-gold-300 group-hover:bg-gold-400 group-hover:text-navy-950 sm:h-20 sm:w-20">
                      <Icon name="play" filled className="ml-1 h-6 w-6 sm:h-7 sm:w-7" />
                    </span>
                    <span className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-4 text-left sm:p-6">
                      {current.id === featured.id ? (
                        <span className="rounded-sm bg-burgundy-600 px-2.5 py-1 font-sans text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white">
                          {t({ en: 'Latest', ml: 'പുതിയത്' })}
                        </span>
                      ) : null}
                      <span className="font-sans text-2xs tabular-nums text-stone-200">
                        {current.duration}
                      </span>
                    </span>
                  </button>
                )}
              </div>

              <h3 className="mt-6 font-display text-2xl leading-snug text-[rgb(var(--ink))] sm:text-3xl">
                {t(current.title)}
              </h3>
              {t(current.description) ? (
                <p className="mt-2 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                  {t(current.description)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="flex items-center gap-2 font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  <Icon name="calendar" className="h-3.5 w-3.5 text-gold-500" />
                  {formatDate(current.published, lang)}
                </span>
                <a
                  href={`https://www.youtube.com/watch?v=${current.id}`}
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

          {/* bulletins and the channel, level with the player */}
          <Reveal delay={0.1}>
            <aside className="flex flex-col gap-5">
              <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-6 sm:p-7">
                <h4 className="flex items-center gap-2.5 font-display text-xl text-[rgb(var(--ink))]">
                  <Icon name="file" className="h-5 w-5 text-gold-500" />
                  {t({ en: 'Parish Bulletins', ml: 'ഇടവക ബുള്ളറ്റിനുകൾ' })}
                </h4>
                <ul className="mt-4 divide-y divide-[rgb(var(--line))]">
                  {media.bulletins.map((bulletin) => (
                    <li key={bulletin.id}>
                      <a
                        href={bulletin.file}
                        download
                        className="group flex items-center justify-between gap-4 py-3.5"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-sans text-sm text-[rgb(var(--ink))] transition-colors group-hover:text-gold-600 dark:group-hover:text-gold-300">
                            {t(bulletin.title)}
                          </span>
                          <span className="font-sans text-2xs text-[rgb(var(--muted))]">
                            PDF · {bulletin.size}
                          </span>
                        </span>
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgb(var(--line))] text-[rgb(var(--muted))] transition-colors group-hover:border-gold-400 group-hover:text-gold-500">
                          <Icon name="download" className="h-4 w-4" />
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* the channel itself, for everything older than what is shown here */}
              <a
                href={media.channel.url}
                target="_blank"
                rel="noreferrer noopener"
                className="group flex items-center gap-4 rounded-sm border border-navy-800 bg-navy-950 p-5 text-stone-200 transition-colors hover:border-gold-400/60 sm:p-6"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-gold-400/40 text-gold-300 transition-colors group-hover:bg-gold-400 group-hover:text-navy-950">
                  <Icon name="youtube" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-2xs uppercase tracking-[0.16em] text-gold-300">
                    {t({ en: 'Visit the parish channel', ml: 'ഇടവക ചാനൽ സന്ദർശിക്കുക' })}
                  </span>
                  <span className="mt-1 block truncate font-serif text-lg text-white">
                    {media.channel.name}
                  </span>
                  <span className="block font-sans text-2xs text-stone-400">
                    {t({
                      en: 'Livestreams of feasts and Sunday Mass',
                      ml: 'തിരുനാളുകളുടെയും ഞായറാഴ്ച കുർബാനയുടെയും തത്സമയ സംപ്രേഷണം',
                    })}
                  </span>
                </span>
                <Icon
                  name="arrowRight"
                  className="h-4 w-4 shrink-0 text-gold-400 transition-transform duration-300 group-hover:translate-x-1"
                />
              </a>
            </aside>
          </Reveal>
        </div>

        {others.length ? (
          <div className="mt-16 lg:mt-20">
            <div className="flex items-end justify-between gap-4 border-b border-[rgb(var(--line))] pb-4">
              <h4 className="font-display text-xl text-[rgb(var(--ink))] sm:text-2xl">
                {t({ en: 'More videos', ml: 'കൂടുതൽ വീഡിയോകൾ' })}
              </h4>
              <span className="font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                {others.length} {t({ en: 'in all', ml: 'ആകെ' })}
              </span>
            </div>

            <StaggerGroup className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 xl:grid-cols-4 xl:gap-x-6">
              {shown.map((video) => (
                <motion.button
                  key={video.id}
                  type="button"
                  variants={staggerItem}
                  onClick={() => play(video)}
                  aria-label={`${t(ui.common.playVideo)}: ${t(video.title)}`}
                  className="group flex min-w-0 flex-col text-left"
                >
                  <span className="relative block aspect-video w-full overflow-hidden rounded-sm border border-[rgb(var(--line))] bg-navy-900">
                    <Image
                      src={thumb(video.id)}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-sacred group-hover:scale-105"
                    />
                    <span className="absolute inset-0 grid place-items-center bg-navy-950/0 transition-colors duration-300 group-hover:bg-navy-950/35">
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-navy-950/60 text-white opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Icon name="play" filled className="ml-0.5 h-5 w-5" />
                      </span>
                    </span>
                    {video.duration ? (
                      <span className="absolute bottom-1.5 right-1.5 rounded-sm bg-navy-950/80 px-1.5 py-0.5 font-sans text-[0.65rem] tabular-nums text-white">
                        {video.duration}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-3 line-clamp-2 font-serif text-[1rem] leading-snug text-[rgb(var(--ink))] transition-colors group-hover:text-gold-600 dark:group-hover:text-gold-300 sm:text-[1.05rem]">
                    {t(video.title)}
                  </span>
                  <span className="mt-1 font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                    {formatDate(video.published, lang)}
                  </span>
                </motion.button>
              ))}
            </StaggerGroup>

            {others.length > FIRST_SHOWN ? (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAll((open) => !open)}
                  aria-expanded={showAll}
                  className="btn-outline !py-2.5 !text-[0.6rem]"
                >
                  {showAll
                    ? t({ en: 'Show fewer', ml: 'കുറച്ച് കാണിക്കുക' })
                    : t({
                        en: `Show all ${others.length} videos`,
                        ml: `എല്ലാ ${others.length} വീഡിയോകളും കാണിക്കുക`,
                      })}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
