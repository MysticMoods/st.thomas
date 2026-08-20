'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type { HallCalendar as Calendar } from '@/lib/hall'
import { isFree, rentOf } from '@/lib/hall'
import { useAdminMode } from '@/components/admin/AdminMode'
import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { cn, formatDate, formatNumber, isEmail } from '@/lib/utils'

import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'
import { HallCalendar } from './HallCalendar'
import { HallDay } from './HallDay'
import { HallSlotManager } from './HallSlotManager'

type Availability = {
  calendar: Calendar
  window: { first: string; last: string }
}

/**
 * Pick a hall, a day and a session, tick what is needed, send. The parish
 * office then rings back — no money changes hands on the site.
 */
export function HallBooking({ hall }: { hall: HallContent }) {
  const { t, lang } = useLang()
  const { isAdmin } = useAdminMode()
  // The slot staff opened from the day panel, to manage rather than to request.
  const [managing, setManaging] = useState<{ date: string; room: string; session: string } | null>(
    null,
  )

  const [availability, setAvailability] = useState<Availability | null>(null)
  const [roomId, setRoomId] = useState(hall.halls[0]?.id ?? '')
  const [session, setSession] = useState(hall.sessions[0]?.id ?? 'morning')
  const [date, setDate] = useState('')
  // The day opened below the calendar — every hall, every session, spelled out.
  const [day, setDay] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [form, setForm] = useState({ name: '', phone: '', email: '', purpose: '', guests: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hall/availability', { cache: 'no-store' })
      setAvailability(await res.json())
    } catch {
      setAvailability({ calendar: {}, window: { first: '0000-00-00', last: '9999-99-99' } })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const room = hall.halls.find((entry) => entry.id === roomId)

  // Changing room or session can invalidate the chosen day — the large hall may
  // be taken all morning while the small room stands empty.
  useEffect(() => {
    if (date && availability && !isFree(hall, availability.calendar, roomId, date, session)) {
      setDate('')
    }
  }, [hall, roomId, session, date, availability])

  // Only what this room can offer: the small hall has no air conditioning to
  // charge for, so it must not appear on its form.
  const offered = useMemo(
    () => hall.amenities.filter((amenity) => room?.amenities.includes(amenity.id)),
    [hall.amenities, room],
  )

  useEffect(() => {
    setAmenities((current) => current.filter((id) => room?.amenities.includes(id)))
  }, [room])

  const chosenSession = hall.sessions.find((entry) => entry.id === session)
  const rent = rentOf(room, session)
  const extras = useMemo(
    () =>
      offered
        .filter((amenity) => amenities.includes(amenity.id))
        .reduce((sum, amenity) => sum + amenity.rate, 0),
    [amenities, offered],
  )

  const toggle = (id: string) =>
    setAmenities((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )

  /** Opening a day fills the panel beside the calendar and moves its highlight. */
  const openDay = (next: string) => setDay(next)

  /**
   * A session picked out of the day panel becomes the request: the hall, the
   * day and the hours are all settled in one tap, and the form comes into view
   * already saying which of the three halls it is for.
   */
  function choose(nextRoom: string, nextSession: string) {
    setRoomId(nextRoom)
    setSession(nextSession)
    setDate(day)
    setStatus('idle')
    setError('')
    document.getElementById('book-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!date) {
      setError(
        t({
          en: 'Choose a free day on the calendar first.',
          ml: 'ആദ്യം കലണ്ടറിൽ ഒഴിവുള്ള ഒരു ദിവസം തിരഞ്ഞെടുക്കുക.',
        }),
      )
      setStatus('error')
      return
    }
    if (!form.name.trim() || !form.phone.trim() || !isEmail(form.email)) {
      setError(
        t({
          en: 'Name, phone number and a valid email address are needed.',
          ml: 'പേര്, ഫോൺ നമ്പർ, ശരിയായ ഇമെയിൽ വിലാസം എന്നിവ ആവശ്യമാണ്.',
        }),
      )
      setStatus('error')
      return
    }

    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/hall/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          guests: Number(form.guests) || 0,
          hall: roomId,
          date,
          session,
          amenities,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not send the request')
      setStatus('sent')
      setDate('')
      setAmenities([])
      setForm({ name: '', phone: '', email: '', purpose: '', guests: '', message: '' })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the request')
      setStatus('error')
      load()
    }
  }

  return (
    <section id="book" className="section bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Availability', ml: 'ലഭ്യത' }}
          title={{ en: 'Find a free day', ml: 'ഒഴിവുള്ള ദിവസം കണ്ടെത്തുക' }}
          subtitle={hall.booking.note}
        />

        {/* step one — which of the three halls */}
        <Reveal>
          <p className="mt-14 text-center font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
            {t({ en: 'Step 1 · Which hall', ml: 'ഘട്ടം 1 · ഏത് ഹാൾ' })}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {hall.halls.map((entry) => (
              <button
                key={entry.id}
                id={`book-${entry.id}`}
                type="button"
                onClick={() => setRoomId(entry.id)}
                aria-pressed={roomId === entry.id}
                className={cn(
                  'scroll-mt-32 rounded-sm border p-5 text-left transition-all duration-300',
                  roomId === entry.id
                    ? 'border-gold-400 bg-gold-400/10'
                    : 'border-[rgb(var(--line))] hover:border-gold-300',
                )}
              >
                <span className="block font-display text-lg text-[rgb(var(--ink))]">
                  {t(entry.name)}
                </span>
                <span className="mt-1 block font-sans text-2xs text-[rgb(var(--muted))]">
                  {formatNumber(entry.seated, lang)} {t({ en: 'seated', ml: 'ഇരുന്ന്' })}
                  {entry.features.ac ? ` · ${t({ en: 'AC', ml: 'എസി' })}` : ''}
                  {entry.features.stage ? ` · ${t({ en: 'stage', ml: 'വേദി' })}` : ''}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* what that hall costs, before any day is opened */}
        <Reveal delay={0.05}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {hall.sessions.map((entry) => (
              <span key={entry.id} className="font-sans text-2xs text-[rgb(var(--muted))]">
                <span className="font-semibold uppercase tracking-[0.14em] text-[rgb(var(--ink))]">
                  {t(entry.label)}
                </span>{' '}
                {t(entry.hours)} · ₹{formatNumber(rentOf(room, entry.id), lang)}
              </span>
            ))}
          </div>
        </Reveal>

        {isAdmin ? (
          <p className="mx-auto mt-8 max-w-2xl rounded-sm border border-gold-400/50 bg-gold-400/10 px-5 py-3 text-center font-sans text-2xs text-[rgb(var(--ink))]">
            Parish office: open a day, then tap the hall and session you want — you can see who
            has it, write in a booking taken at the counter, or free a slot again.
          </p>
        ) : null}

        <p className="mt-10 text-center font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
          {t({ en: 'Step 2 · Which day', ml: 'ഘട്ടം 2 · ഏത് ദിവസം' })}
        </p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          {availability ? (
            <HallCalendar
              hall={hall}
              calendar={availability.calendar}
              window={availability.window}
              room={roomId}
              selected={day || date}
              onPick={openDay}
            />
          ) : (
            <div className="skeleton h-[28rem] rounded-sm" />
          )}

          {availability && day ? (
            <HallDay
              hall={hall}
              calendar={availability.calendar}
              date={day}
              {...(date === day
                ? { room: roomId, session }
                : // nothing is ticked until a session is actually chosen
                  { room: '', session: '' })}
              isAdmin={isAdmin}
              onChoose={choose}
              onManage={(entry, slot) => setManaging({ date: day, room: entry, session: slot })}
              onClose={() => setDay('')}
            />
          ) : (
            <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-sm border border-dashed border-[rgb(var(--line))] p-8 text-center">
              <Icon name="calendar" className="h-7 w-7 text-gold-500" />
              <p className="mt-4 font-serif text-lg text-[rgb(var(--ink))]">
                {t({ en: 'Choose a day', ml: 'ഒരു ദിവസം തിരഞ്ഞെടുക്കുക' })}
              </p>
              <p className="mt-2 max-w-xs font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                {t({
                  en: 'Tap any date in the calendar and every hall shows here — morning, evening or the whole day, with what each one costs.',
                  ml: 'കലണ്ടറിലെ ഏതെങ്കിലും തീയതിയിൽ ടാപ്പ് ചെയ്യുക — രാവിലെ, വൈകുന്നേരം, ദിവസം മുഴുവൻ എന്നിവയും നിരക്കും സഹിതം എല്ലാ ഹാളുകളും ഇവിടെ കാണാം.',
                })}
              </p>
            </div>
          )}
        </div>

        <form id="book-form" onSubmit={submit} className="mx-auto mt-16 max-w-4xl scroll-mt-40">
          <div className="card p-7 sm:p-10">
            <p className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
              {t({ en: 'Your request', ml: 'നിങ്ങളുടെ അപേക്ഷ' })}
            </p>
            {date ? (
              <>
                <p className="mt-3 font-serif text-xl text-[rgb(var(--ink))]">
                  {t(room?.name ?? { en: '', ml: '' })}
                  {room?.combines?.length
                    ? ` · ${t({ en: 'both halls together', ml: 'രണ്ട് ഹാളും ഒരുമിച്ച്' })}`
                    : ''}
                </p>
                <p className="mt-1 font-sans text-sm text-[rgb(var(--muted))]">
                  {formatDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' · '}
                  {t(chosenSession?.label ?? { en: '', ml: '' })}
                  {chosenSession ? ` · ${t(chosenSession.hours)}` : ''}
                </p>
              </>
            ) : (
              <p className="mt-3 font-serif text-xl text-[rgb(var(--muted))]">
                {t({
                  en: 'No day chosen yet — pick one on the calendar above.',
                  ml: 'ദിവസം തിരഞ്ഞെടുത്തിട്ടില്ല — മുകളിലെ കലണ്ടറിൽ നിന്ന് ഒന്ന് തിരഞ്ഞെടുക്കുക.',
                })}
              </p>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'Name', ml: 'പേര്' })}</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="field"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'Phone', ml: 'ഫോൺ' })}</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="field"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'Email', ml: 'ഇമെയിൽ' })}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="field"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'Occasion', ml: 'അവസരം' })}</span>
                <input
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder={t({ en: 'Wedding reception, meeting…', ml: 'വിവാഹ സ്വീകരണം, യോഗം…' })}
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'People expected', ml: 'പ്രതീക്ഷിക്കുന്ന ആളുകൾ' })}</span>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  value={form.guests}
                  onChange={(e) => setForm({ ...form, guests: e.target.value })}
                  className="field tabular-nums"
                />
              </label>
            </div>

            <fieldset className="mt-8">
              <legend className="eyebrow">
                {t({ en: 'What will you need?', ml: 'എന്തൊക്കെ വേണം?' })}
              </legend>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {offered.map((amenity) => {
                  const on = amenities.includes(amenity.id)
                  return (
                    <label
                      key={amenity.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors duration-300',
                        on
                          ? 'border-gold-400 bg-gold-400/10'
                          : 'border-[rgb(var(--line))] hover:border-gold-300',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(amenity.id)}
                        className="mt-1 h-4 w-4 shrink-0 accent-gold-500"
                      />
                      <span className="min-w-0">
                        <span className="block font-sans text-sm font-medium text-[rgb(var(--ink))]">
                          {t(amenity.label)}
                        </span>
                        <span className="block font-sans text-2xs text-[rgb(var(--muted))]">
                          {t(amenity.note)} · ₹{formatNumber(amenity.rate, lang)}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
              {room && !room.features.ac ? (
                <p className="mt-3 font-sans text-2xs text-[rgb(var(--muted))]">
                  {t({
                    en: 'This hall has no air conditioning and no stage.',
                    ml: 'ഈ ഹാളിൽ എയർ കണ്ടീഷനിംഗോ വേദിയോ ഇല്ല.',
                  })}
                </p>
              ) : null}
            </fieldset>

            <label className="mt-8 flex flex-col gap-2">
              <span className="eyebrow">{t({ en: 'Anything else', ml: 'മറ്റെന്തെങ്കിലും' })}</span>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="field resize-y"
              />
            </label>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[rgb(var(--line))] pt-6">
              <div>
                <p className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  {t({ en: 'Indicative total', ml: 'ഏകദേശ തുക' })}
                </p>
                <p className="mt-1 font-display text-3xl tabular-nums text-[rgb(var(--ink))]">
                  ₹{formatNumber(rent + extras, lang)}
                </p>
                <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
                  {t({ en: 'Hall', ml: 'ഹാൾ' })} ₹{formatNumber(rent, lang)}
                  {extras
                    ? ` + ${t({ en: 'extras', ml: 'അധികം' })} ₹${formatNumber(extras, lang)}`
                    : ''}
                  {' · '}
                  {t({ en: 'advance', ml: 'അഡ്വാൻസ്' })} ₹
                  {formatNumber(hall.booking.advance, lang)}
                </p>
              </div>

              <button type="submit" disabled={status === 'sending'} className="btn-primary">
                {status === 'sending'
                  ? t({ en: 'Sending…', ml: 'അയയ്ക്കുന്നു…' })
                  : t({ en: 'Send the request', ml: 'അപേക്ഷ അയയ്ക്കുക' })}
                <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            </div>

            {status === 'sent' ? (
              <p className="mt-5 rounded-sm border border-gold-400/40 bg-gold-400/10 p-4 font-sans text-sm text-[rgb(var(--ink))]">
                {t({
                  en: 'The request has reached the parish office. Someone will ring you to confirm the day and take the advance.',
                  ml: 'അപേക്ഷ ഇടവക ഓഫീസിൽ എത്തി. ദിവസം ഉറപ്പിക്കാനും അഡ്വാൻസ് സ്വീകരിക്കാനും ആരെങ്കിലും വിളിക്കും.',
                })}
              </p>
            ) : null}

            {status === 'error' && error ? (
              <p className="mt-5 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
                {error}
              </p>
            ) : null}

            <p className="mt-6 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
              {t(hall.booking.contact.hours)} · {hall.booking.contact.phone}
            </p>
          </div>
        </form>
      </div>

      {managing ? (
        <HallSlotManager
          hall={hall}
          room={managing.room}
          date={managing.date}
          session={managing.session}
          onClose={() => setManaging(null)}
          onChanged={load}
        />
      ) : null}
    </section>
  )
}
