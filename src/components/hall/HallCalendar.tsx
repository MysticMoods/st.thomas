'use client'

import { useMemo } from 'react'

import type { HallCalendar as Calendar } from '@/lib/hall'
import { dateKey, dayTone } from '@/lib/hall'
import { useAdminMode } from '@/components/admin/AdminMode'
import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'

type Props = {
  hall: HallContent
  calendar: Calendar
  window: { first: string; last: string }
  room: string
  session: string
  selected: string
  onSelect: (date: string) => void
  /** Staff may click any day, taken or not, to manage it. */
  onManage?: (date: string, tone: 'free' | 'held' | 'taken' | 'blocked') => void
}

/** Twelve months from this one, drawn as a wall calendar for one room. */
export function HallCalendar({
  hall,
  calendar,
  window,
  room,
  session,
  selected,
  onSelect,
  onManage,
}: Props) {
  const { t, lang } = useLang()
  const { isAdmin } = useAdminMode()

  const months = useMemo(() => {
    const start = new Date()
    start.setDate(1)
    return Array.from({ length: Math.max(1, hall.booking.monthsAhead) }, (_, i) => {
      const month = new Date(start)
      month.setMonth(start.getMonth() + i)
      return month
    })
  }, [hall.booking.monthsAhead])

  const weekdays =
    lang === 'ml'
      ? ['ഞാ', 'തി', 'ചൊ', 'ബു', 'വ്യാ', 'വെ', 'ശ']
      : ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        {[
          { tone: 'free', label: { en: 'Free', ml: 'ഒഴിവ്' } },
          { tone: 'held', label: { en: 'Held', ml: 'തീരുമാനത്തിലാണ്' } },
          { tone: 'taken', label: { en: 'Booked', ml: 'ബുക്ക് ചെയ്തു' } },
          { tone: 'blocked', label: { en: 'Parish use', ml: 'ഇടവക ഉപയോഗം' } },
        ].map((item) => (
          <span key={item.tone} className="flex items-center gap-2">
            <span
              className={cn(
                'h-3 w-3 rounded-[4px] border',
                item.tone === 'free' && 'border-[rgb(var(--line))] bg-[rgb(var(--card))]',
                item.tone === 'held' && 'border-gold-400/70 bg-gold-400/30',
                item.tone === 'taken' && 'border-burgundy-400/60 bg-burgundy-400/40',
                item.tone === 'blocked' && 'border-navy-400/60 bg-navy-500/40',
              )}
            />
            <span className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
              {t(item.label)}
            </span>
          </span>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {months.map((month) => {
          const year = month.getFullYear()
          const first = new Date(year, month.getMonth(), 1)
          const days = new Date(year, month.getMonth() + 1, 0).getDate()

          return (
            <div
              key={`${year}-${month.getMonth()}`}
              className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] p-4"
            >
              <p className="mb-3 text-center font-display text-lg text-[rgb(var(--ink))]">
                {month.toLocaleDateString(lang === 'ml' ? 'ml-IN' : 'en-IN', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>

              <div className="grid grid-cols-7 gap-1">
                {weekdays.map((day, i) => (
                  <span
                    key={i}
                    className="pb-1 text-center font-sans text-[0.55rem] uppercase tracking-[0.1em] text-[rgb(var(--muted))]"
                  >
                    {day}
                  </span>
                ))}

                {Array.from({ length: first.getDay() }, (_, i) => (
                  <span key={`pad${i}`} />
                ))}

                {Array.from({ length: days }, (_, i) => {
                  const date = new Date(year, month.getMonth(), i + 1)
                  const key = dateKey(date)
                  const outside = key < window.first || key > window.last
                  const tone = dayTone(hall, calendar, room, key, session)
                  const free = tone === 'free' && !outside
                  const isSelected = selected === key
                  // Staff can open any day; a visitor can only take a free one.
                  const clickable = free || (isAdmin && !!onManage && !outside)

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!clickable}
                      onClick={() => {
                        if (isAdmin && onManage) {
                          onManage(key, tone)
                          return
                        }
                        onSelect(key)
                      }}
                      aria-pressed={isSelected}
                      aria-label={`${key} — ${tone}`}
                      title={outside ? 'Outside the booking window' : tone}
                      className={cn(
                        'aspect-square rounded-[6px] border font-sans text-2xs tabular-nums transition-colors duration-200',
                        outside && 'cursor-not-allowed border-transparent text-[rgb(var(--muted))]/35',
                        !outside &&
                          tone === 'free' &&
                          'border-[rgb(var(--line))] text-[rgb(var(--ink))] hover:border-gold-400 hover:bg-gold-400/10',
                        tone === 'held' &&
                          'border-gold-400/60 bg-gold-400/25 text-gold-700 dark:text-gold-200',
                        tone === 'taken' &&
                          'border-burgundy-400/50 bg-burgundy-400/30 text-burgundy-700 dark:text-burgundy-200',
                        tone === 'blocked' &&
                          'border-navy-400/50 bg-navy-500/30 text-navy-700 dark:text-stone-300',
                        // a taken day is dead to a visitor but live to staff
                        tone !== 'free' && (clickable ? 'cursor-pointer' : 'cursor-not-allowed'),
                        isSelected && 'border-gold-400 bg-gold-400 text-navy-950 hover:bg-gold-400',
                      )}
                    >
                      {formatNumber(i + 1, lang)}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
