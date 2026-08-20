'use client'

import { useEffect, useMemo, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import type { HallCalendar as Calendar, SlotState } from '@/lib/hall'
import { blockedOn, dateKey, roomDay } from '@/lib/hall'
import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'

type Props = {
  hall: HallContent
  calendar: Calendar
  window: { first: string; last: string }
  /** The hall the month is drawn for — one room at a time, named above the grid. */
  room: string
  selected: string
  onPick: (date: string) => void
}

const TONE: Record<SlotState, string> = {
  free: 'bg-[rgb(var(--line))]',
  held: 'bg-gold-400',
  taken: 'bg-burgundy-500',
  blocked: 'bg-navy-500',
}

/** First of the month, which is how a month is carried around in here. */
function monthStart(value: Date | string) {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00`) : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

/**
 * One month of one hall. Each square carries a bar for every session, so a day
 * booked only in the morning does not read the same as a day that is gone.
 */
export function HallCalendar({ hall, calendar, window, room, selected, onPick }: Props) {
  const { t, lang } = useLang()

  const locale = lang === 'ml' ? 'ml-IN' : 'en-IN'
  const roomName = hall.halls.find((entry) => entry.id === room)?.name

  // Every month the booking window touches, first to last.
  const months = useMemo(() => {
    const first = monthStart(window.first)
    const last = monthStart(window.last)
    const list: Date[] = []
    for (let month = first; month <= last; month = new Date(month.getFullYear(), month.getMonth() + 1, 1)) {
      list.push(month)
      if (list.length > 60) break
    }
    return list
  }, [window.first, window.last])

  const [cursor, setCursor] = useState(() => monthStart(window.first))

  // Opening a day from elsewhere — or the window moving — should bring its month
  // into view rather than leave the visitor looking at the wrong page.
  useEffect(() => {
    if (selected) setCursor(monthStart(selected))
  }, [selected])

  useEffect(() => {
    setCursor((current) => (months.some((month) => sameMonth(month, current)) ? current : months[0] ?? current))
  }, [months])

  const index = months.findIndex((month) => sameMonth(month, cursor))
  const step = (by: number) => {
    const next = months[index + by]
    if (next) setCursor(next)
  }

  const weekdays =
    lang === 'ml'
      ? ['ഞാ', 'തി', 'ചൊ', 'ബു', 'വ്യാ', 'വെ', 'ശ']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const days = new Date(year, month + 1, 0).getDate()
  const pad = new Date(year, month, 1).getDay()

  return (
    <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-5 sm:p-7">
      {/* which hall, which month */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-sans text-2xs uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400">
            {t({ en: 'Diary for', ml: 'ഡയറി' })}
          </p>
          <p className="mt-1 font-display text-2xl leading-tight text-[rgb(var(--ink))]">
            {t(roomName ?? { en: '', ml: '' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={index <= 0}
            aria-label={t({ en: 'Previous month', ml: 'മുൻ മാസം' })}
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-[rgb(var(--line))] text-[rgb(var(--ink))] transition-colors hover:border-gold-400 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>

          <label className="sr-only" htmlFor="hall-month">
            {t({ en: 'Month', ml: 'മാസം' })}
          </label>
          <select
            id="hall-month"
            value={index < 0 ? 0 : index}
            onChange={(event) => setCursor(months[Number(event.target.value)] ?? cursor)}
            className="field min-w-[11rem] py-2.5 text-center font-display text-lg"
          >
            {months.map((entry, i) => (
              <option key={`${entry.getFullYear()}-${entry.getMonth()}`} value={i}>
                {entry.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => step(1)}
            disabled={index < 0 || index >= months.length - 1}
            aria-label={t({ en: 'Next month', ml: 'അടുത്ത മാസം' })}
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-[rgb(var(--line))] text-[rgb(var(--ink))] transition-colors hover:border-gold-400 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* the month */}
      <div className="mt-6 grid grid-cols-7 gap-1 sm:gap-2">
        {weekdays.map((day, i) => (
          <span
            key={i}
            className="pb-1 text-center font-sans text-[0.6rem] uppercase tracking-[0.1em] text-[rgb(var(--muted))]"
          >
            {day.slice(0, 3)}
          </span>
        ))}

        {Array.from({ length: pad }, (_, i) => (
          <span key={`pad${i}`} />
        ))}

        {Array.from({ length: days }, (_, i) => {
          const date = new Date(year, month, i + 1)
          const key = dateKey(date)
          const outside = key < window.first || key > window.last
          const day = roomDay(hall, calendar, room, key)
          const isSelected = selected === key
          const block = day.blocked ? blockedOn(hall, key) : undefined

          const state = (value: SlotState) =>
            value === 'free'
              ? t({ en: 'free', ml: 'ഒഴിവ്' })
              : value === 'held'
                ? t({ en: 'held', ml: 'തീരുമാനത്തിലാണ്' })
                : t({ en: 'booked', ml: 'ബുക്ക് ചെയ്തു' })

          // Said in words for a screen reader, and used as the square's tooltip.
          const words = day.blocked
            ? t({ en: 'kept by the parish', ml: 'ഇടവക ഉപയോഗം' })
            : day.summary === 'free'
              ? t({ en: 'free all day', ml: 'ദിവസം മുഴുവൻ ഒഴിവ്' })
              : day.wholeDay
                ? `${state(day.parts[0]?.state ?? 'taken')} ${t({ en: 'all day', ml: 'ദിവസം മുഴുവൻ' })}`
                : day.parts
                    .map(
                      (part) =>
                        `${t(
                          hall.sessions.find((entry) => entry.id === part.id)?.label ?? {
                            en: part.id,
                            ml: part.id,
                          },
                        )} ${state(part.state)}`,
                    )
                    .join(', ')

          return (
            <button
              key={key}
              type="button"
              data-date={key}
              disabled={outside}
              onClick={() => onPick(key)}
              aria-pressed={isSelected}
              aria-label={`${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })} — ${
                outside
                  ? t({ en: 'outside the booking window', ml: 'ബുക്കിംഗ് കാലയളവിന് പുറത്ത്' })
                  : words
              }`}
              title={
                outside
                  ? t({ en: 'Outside the booking window', ml: 'ബുക്കിംഗ് കാലയളവിന് പുറത്ത്' })
                  : block
                    ? t(block.reason)
                    : words
              }
              className={cn(
                'flex min-h-[3.25rem] flex-col items-center justify-between rounded-sm border p-1.5 transition-colors duration-200 sm:min-h-[4rem] sm:p-2',
                outside
                  ? 'cursor-not-allowed border-transparent text-[rgb(var(--muted))]/30'
                  : 'cursor-pointer border-[rgb(var(--line))] text-[rgb(var(--ink))] hover:border-gold-400 hover:bg-gold-400/10',
                !outside && day.blocked && 'border-navy-400/50 bg-navy-500/15',
                !outside && !day.blocked && day.summary === 'full' && 'bg-burgundy-500/10',
                isSelected && 'border-gold-400 bg-gold-400/25 hover:bg-gold-400/25',
              )}
            >
              <span className="font-sans text-sm tabular-nums leading-none">
                {formatNumber(i + 1, lang)}
              </span>

              {/* one wide bar means the whole day; two short bars are the two halves */}
              {outside ? (
                <span className="h-1.5 w-full" />
              ) : day.blocked || day.wholeDay ? (
                <span
                  className={cn(
                    'h-1.5 w-full rounded-full',
                    day.blocked ? TONE.blocked : TONE[day.parts[0]?.state ?? 'taken'],
                  )}
                />
              ) : (
                <span className="flex w-full gap-[3px]">
                  {day.parts.map((part) => (
                    <span
                      key={part.id}
                      className={cn('h-1.5 flex-1 rounded-full', TONE[part.state])}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* what the bars mean */}
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[rgb(var(--line))] pt-5">
        {(
          [
            { tone: 'free', label: { en: 'Free', ml: 'ഒഴിവ്' } },
            { tone: 'held', label: { en: 'Held', ml: 'തീരുമാനത്തിലാണ്' } },
            { tone: 'taken', label: { en: 'Booked', ml: 'ബുക്ക് ചെയ്തു' } },
            { tone: 'blocked', label: { en: 'Parish use', ml: 'ഇടവക ഉപയോഗം' } },
          ] as { tone: SlotState; label: { en: string; ml: string } }[]
        ).map((item) => (
          <span key={item.tone} className="flex items-center gap-2">
            <span className={cn('h-1.5 w-6 rounded-full', TONE[item.tone])} />
            <span className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
              {t(item.label)}
            </span>
          </span>
        ))}

        <p className="w-full font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
          {t({
            en: 'Two short bars are the morning and the evening; one bar across the square means the whole day is taken. Tap a day to see all three halls and their hours.',
            ml: 'രണ്ട് ചെറിയ വരകൾ രാവിലെയും വൈകുന്നേരവും; ചതുരത്തിന് കുറുകെയുള്ള ഒറ്റ വര ദിവസം മുഴുവൻ എടുത്തു എന്നർത്ഥം. മൂന്ന് ഹാളുകളും സമയവും കാണാൻ ഒരു ദിവസത്തിൽ ടാപ്പ് ചെയ്യുക.',
          })}
        </p>
      </div>
    </div>
  )
}
