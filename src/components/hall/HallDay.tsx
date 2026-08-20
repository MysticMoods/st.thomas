'use client'

import { Icon } from '@/components/ui/Icon'
import type { HallCalendar as Calendar, SlotState } from '@/lib/hall'
import { blockedOn, dayTone, rentOf } from '@/lib/hall'
import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { cn, formatDate, formatNumber } from '@/lib/utils'

type Props = {
  hall: HallContent
  calendar: Calendar
  date: string
  /** The hall and session chosen so far, so the current slot reads as chosen. */
  room: string
  session: string
  isAdmin: boolean
  onChoose: (room: string, session: string) => void
  onManage: (room: string, session: string) => void
  onClose: () => void
}

const WORD: Record<SlotState, { en: string; ml: string }> = {
  free: { en: 'Free', ml: 'ഒഴിവ്' },
  held: { en: 'Held', ml: 'തീരുമാനത്തിലാണ്' },
  taken: { en: 'Booked', ml: 'ബുക്ക് ചെയ്തു' },
  blocked: { en: 'Parish use', ml: 'ഇടവക ഉപയോഗം' },
}

/**
 * One day, spelled out: every hall, every session, and the hours each session
 * covers. This is the answer to "is it booked all day, and which hall?" — the
 * month grid can only hint at it.
 */
export function HallDay({
  hall,
  calendar,
  date,
  room,
  session,
  isAdmin,
  onChoose,
  onManage,
  onClose,
}: Props) {
  const { t, lang } = useLang()
  const block = blockedOn(hall, date)

  return (
    <div
      id="day-panel"
      className="scroll-mt-40 rounded-sm border border-gold-400/50 bg-[rgb(var(--card))] p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-sans text-2xs uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400">
            {t({ en: 'Step 3 · Which session', ml: 'ഘട്ടം 3 · ഏത് സെഷൻ' })}
          </p>
          <p className="mt-1 font-display text-2xl leading-tight text-[rgb(var(--ink))]">
            {formatDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
        >
          <Icon name="close" className="h-3.5 w-3.5" />
          {t({ en: 'Close', ml: 'അടയ്ക്കുക' })}
        </button>
      </div>

      {block ? (
        <p className="mt-5 rounded-sm border border-navy-400/40 bg-navy-500/10 px-4 py-3 font-sans text-sm text-[rgb(var(--ink))]">
          {t({ en: 'Kept by the parish', ml: 'ഇടവക മാറ്റിവച്ചിരിക്കുന്നു' })} — {t(block.reason)}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3">
        {hall.halls.map((entry) => {
          const combined = !!entry.combines?.length

          return (
            <div
              key={entry.id}
              data-hall={entry.id}
              className={cn(
                'rounded-sm border p-4 sm:p-5',
                combined ? 'border-gold-400/40 bg-gold-400/5' : 'border-[rgb(var(--line))]',
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-lg text-[rgb(var(--ink))]">{t(entry.name)}</span>
                <span className="font-sans text-2xs text-[rgb(var(--muted))]">
                  {formatNumber(entry.seated, lang)} {t({ en: 'seated', ml: 'ഇരുന്ന്' })}
                  {entry.features.ac ? ` · ${t({ en: 'AC', ml: 'എസി' })}` : ''}
                  {entry.features.generator ? ` · ${t({ en: 'generator', ml: 'ജനറേറ്റർ' })}` : ''}
                  {entry.features.stage ? ` · ${t({ en: 'stage', ml: 'വേദി' })}` : ''}
                </span>
                {combined ? (
                  <span className="rounded-full border border-gold-400/60 px-2.5 py-0.5 font-sans text-[0.6rem] uppercase tracking-[0.14em] text-gold-700 dark:text-gold-300">
                    {t({ en: 'holds both halls', ml: 'രണ്ട് ഹാളും' })}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {hall.sessions.map((slot) => {
                  const state = dayTone(hall, calendar, entry.id, date, slot.id)
                  const chosen = room === entry.id && session === slot.id
                  const clickable = state === 'free' || isAdmin

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!clickable}
                      onClick={() => (isAdmin ? onManage(entry.id, slot.id) : onChoose(entry.id, slot.id))}
                      aria-pressed={chosen}
                      aria-label={`${entry.name.en} — ${slot.label.en}, ${WORD[state].en}`}
                      className={cn(
                        'rounded-sm border p-3 text-left transition-colors duration-200',
                        state === 'free' &&
                          'border-[rgb(var(--line))] hover:border-gold-400 hover:bg-gold-400/10',
                        state === 'held' && 'border-gold-400/50 bg-gold-400/15',
                        state === 'taken' && 'border-burgundy-400/50 bg-burgundy-500/15',
                        state === 'blocked' && 'border-navy-400/50 bg-navy-500/15',
                        !clickable && 'cursor-not-allowed',
                        chosen && 'border-gold-400 bg-gold-400/25',
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--ink))]">
                          {t(slot.label)}
                        </span>
                        <span
                          className={cn(
                            'font-sans text-[0.6rem] font-semibold uppercase tracking-[0.12em]',
                            state === 'free'
                              ? 'text-gold-600 dark:text-gold-400'
                              : state === 'taken'
                                ? 'text-burgundy-600 dark:text-burgundy-300'
                                : 'text-[rgb(var(--muted))]',
                          )}
                        >
                          {t(WORD[state])}
                        </span>
                      </span>
                      <span className="mt-1 block font-sans text-2xs text-[rgb(var(--muted))]">
                        {t(slot.hours)}
                      </span>
                      <span className="mt-0.5 block font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                        ₹{formatNumber(rentOf(entry, slot.id), lang)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-5 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
        {isAdmin
          ? 'Parish office: tap any slot to see who has it, to write in a booking taken at the counter, or to free it again.'
          : t({
              en: 'Tap a free session to carry it down to the form. Taking the two halls together closes both of them for that session.',
              ml: 'ഒഴിവുള്ള ഒരു സെഷനിൽ ടാപ്പ് ചെയ്താൽ അത് ഫോമിലേക്ക് വരും. രണ്ട് ഹാളും ഒരുമിച്ച് എടുത്താൽ ആ സെഷനിൽ രണ്ടും അടയും.',
            })}
      </p>
    </div>
  )
}
