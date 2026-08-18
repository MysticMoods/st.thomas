'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { UpcomingContent, UpcomingEvent } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'

import Image from 'next/image'

import { Icon } from './ui/Icon'
import { Modal, useDialogId } from './ui/Modal'

const STORAGE_KEY = 'stc-upcoming-dismissed'

/** Events that have not finished yet, soonest first. */
export function futureEvents(events: UpcomingEvent[], now = Date.now()): UpcomingEvent[] {
  return events
    .filter((event) => {
      const end = new Date(event.endDate ?? event.date).getTime()
      if (Number.isNaN(end)) return false
      // A dated event stays listed until the end of its own day.
      return end + 86_400_000 > now
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

/** Whole days from today until the event. Negative once it has started. */
export function daysUntil(date: string, now = Date.now()) {
  const start = new Date(date)
  if (Number.isNaN(start.getTime())) return 0
  const midnight = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  return Math.round((midnight(start) - midnight(new Date(now))) / 86_400_000)
}

/**
 * The card that greets a visitor with what is coming up. It waits for the page
 * to settle, shows at most three events, and remembers a dismissal for as long
 * as the content file asks — so nobody is shown it twice in one visit.
 */
export function EventPopup({ upcoming }: { upcoming: UpcomingContent }) {
  const { t, lang } = useLang()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const titleId = useDialogId('upcoming')

  const events = useMemo(() => futureEvents(upcoming.events).slice(0, 3), [upcoming.events])

  useEffect(() => {
    if (!upcoming.popup.enabled || events.length === 0) return

    try {
      const stored = Number(window.localStorage.getItem(STORAGE_KEY))
      const hours = Math.max(0, upcoming.popup.remindAfterHours)
      if (stored && Date.now() - stored < hours * 3_600_000) return
    } catch {
      /* private browsing — show it, that is the safer default */
    }

    const delay = Math.max(0, upcoming.popup.delaySeconds) * 1000
    const timer = window.setTimeout(() => setOpen(true), delay)
    return () => window.clearTimeout(timer)
  }, [upcoming.popup, events.length])

  const dismiss = () => {
    setOpen(false)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch {
      /* nothing to remember it with — it will simply show again */
    }
  }

  if (events.length === 0) return null

  const active = events[Math.min(index, events.length - 1)]
  const away = daysUntil(active.date)

  return (
    <Modal open={open} onClose={dismiss} labelledBy={titleId} className="max-w-4xl" align="end">
      <div className="grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        {/* the picture for the event being shown */}
        <div className="relative hidden min-h-[26rem] md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, scale: reduce ? 1 : 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={active.image}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>

          <div
            className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/25 to-transparent"
            aria-hidden="true"
          />

          <div className="absolute inset-x-0 bottom-0 p-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/50 bg-navy-950/60 px-3.5 py-1.5 font-sans text-[0.6rem] uppercase tracking-[0.16em] text-gold-200 backdrop-blur">
              <Icon name="calendar" className="h-3.5 w-3.5" />
              {formatDate(active.date, lang, { day: 'numeric', month: 'short', year: undefined })}
            </span>
          </div>
        </div>

        {/* the text side */}
        <div className="flex flex-col p-7 sm:p-9">
          <span className="eyebrow">{t(upcoming.popup.eyebrow)}</span>
          <h2 id={titleId} className="mt-3 font-display text-2xl leading-snug text-[rgb(var(--ink))] sm:text-3xl">
            {t(upcoming.popup.title)}
          </h2>
          <span className="mt-4 block h-px w-16 bg-gold-line" aria-hidden="true" />
          <p className="mt-4 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
            {t(upcoming.popup.subtitle)}
          </p>

          <AnimatePresence mode="wait">
            <motion.article
              key={active.id}
              initial={{ opacity: 0, y: reduce ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -10 }}
              transition={{ duration: reduce ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 rounded-sm border border-gold-400/30 bg-gold-400/[0.06] p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="font-sans text-2xs font-semibold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-300">
                  {formatDate(active.date, lang)}
                </span>
                {away > 0 ? (
                  <span className="font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                    {away === 1
                      ? t({ en: 'tomorrow', ml: 'നാളെ' })
                      : t({ en: `in ${away} days`, ml: `${away} ദിവസത്തിനുള്ളിൽ` })}
                  </span>
                ) : (
                  <span className="font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-burgundy-500 dark:text-burgundy-300">
                    {t({ en: 'Happening now', ml: 'ഇപ്പോൾ നടക്കുന്നു' })}
                  </span>
                )}
              </div>

              <h3 className="mt-3 font-display text-xl leading-snug text-[rgb(var(--ink))]">
                {t(active.title)}
              </h3>

              <p className="mt-3 font-sans text-[0.9rem] leading-relaxed text-[rgb(var(--muted))]">
                {t(active.description)}
              </p>

              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-gold-400/20 pt-4">
                <div className="flex items-center gap-2">
                  <dt className="sr-only">{t({ en: 'Time', ml: 'സമയം' })}</dt>
                  <Icon name="clock" className="h-3.5 w-3.5 text-gold-500" />
                  <dd className="font-sans text-2xs text-[rgb(var(--muted))]">{t(active.time)}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="sr-only">{t({ en: 'Place', ml: 'സ്ഥലം' })}</dt>
                  <Icon name="mapPin" className="h-3.5 w-3.5 text-gold-500" />
                  <dd className="font-sans text-2xs text-[rgb(var(--muted))]">{t(active.place)}</dd>
                </div>
              </dl>
            </motion.article>
          </AnimatePresence>

          {/* one dot per event */}
          {events.length > 1 ? (
            <div className="mt-5 flex items-center gap-2.5">
              {events.map((event, i) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t(event.title)}
                  aria-current={i === index ? 'true' : undefined}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    i === index
                      ? 'w-8 bg-gold-400'
                      : 'w-1.5 bg-[rgb(var(--line))] hover:bg-gold-300',
                  )}
                />
              ))}
              <span className="ml-auto font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                {index + 1} {t(ui.common.of)} {events.length}
              </span>
            </div>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href={active.cta?.href ?? upcoming.popup.cta.href}
              onClick={dismiss}
              className="btn-primary !px-6 !py-3"
            >
              {t(active.cta?.label ?? upcoming.popup.cta.label)}
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={dismiss}
              className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))] transition-colors hover:text-gold-600 dark:hover:text-gold-300"
            >
              {t(upcoming.popup.dismiss)}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
