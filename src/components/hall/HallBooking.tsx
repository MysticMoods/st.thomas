'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useLang } from '@/lib/i18n'
import type { DayState } from '@/lib/hall'
import { isFree } from '@/lib/hall'
import type { HallContent } from '@/lib/types'
import { cn, formatDate, formatNumber, isEmail } from '@/lib/utils'

import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'
import { HallCalendar } from './HallCalendar'

type Availability = {
  calendar: Record<string, DayState>
  window: { first: string; last: string }
}

/**
 * Pick a day, pick a session, tick what is needed, send. The parish office then
 * rings back — no money changes hands on the site.
 */
export function HallBooking({ hall }: { hall: HallContent }) {
  const { t, lang } = useLang()

  const [availability, setAvailability] = useState<Availability | null>(null)
  const [session, setSession] = useState(hall.sessions[0]?.id ?? 'morning')
  const [date, setDate] = useState('')
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

  // Changing session can invalidate the chosen day — a hall taken all morning
  // is still free in the evening, and the other way round.
  useEffect(() => {
    if (date && availability && !isFree(availability.calendar[date], session)) setDate('')
  }, [session, date, availability])

  const rent = hall.sessions.find((entry) => entry.id === session)?.rent ?? 0
  const extras = useMemo(
    () =>
      hall.amenities
        .filter((amenity) => amenities.includes(amenity.id))
        .reduce((sum, amenity) => sum + amenity.rate, 0),
    [amenities, hall.amenities],
  )

  const toggle = (id: string) =>
    setAmenities((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    )

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!date) {
      setError(t({ en: 'Choose a free day on the calendar first.', ml: 'ആദ്യം കലണ്ടറിൽ ഒഴിവുള്ള ഒരു ദിവസം തിരഞ്ഞെടുക്കുക.' }))
      setStatus('error')
      return
    }
    if (!form.name.trim() || !form.phone.trim() || !isEmail(form.email)) {
      setError(t({ en: 'Name, phone number and a valid email address are needed.', ml: 'പേര്, ഫോൺ നമ്പർ, ശരിയായ ഇമെയിൽ വിലാസം എന്നിവ ആവശ്യമാണ്.' }))
      setStatus('error')
      return
    }

    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/hall/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, guests: Number(form.guests) || 0, date, session, amenities }),
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

  const field = 'field'

  return (
    <section id="book" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Availability', ml: 'ലഭ്യത' }}
          title={{ en: 'Find a free day', ml: 'ഒഴിവുള്ള ദിവസം കണ്ടെത്തുക' }}
          subtitle={hall.booking.note}
        />

        <Reveal>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-2">
            {hall.sessions.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSession(entry.id)}
                aria-pressed={session === entry.id}
                className={cn(
                  'rounded-sm border px-5 py-3 text-left transition-all duration-300',
                  session === entry.id
                    ? 'border-gold-400 bg-gold-400/10'
                    : 'border-[rgb(var(--line))] hover:border-gold-300',
                )}
              >
                <span className="block font-sans text-2xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--ink))]">
                  {t(entry.label)}
                </span>
                <span className="mt-1 block font-sans text-2xs text-[rgb(var(--muted))]">
                  {t(entry.hours)} · ₹{formatNumber(entry.rent, lang)}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-12">
          {availability ? (
            <HallCalendar
              hall={hall}
              calendar={availability.calendar}
              window={availability.window}
              session={session}
              selected={date}
              onSelect={setDate}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-64 rounded-sm" />
              ))}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="mx-auto mt-16 max-w-4xl">
          <div className="card p-7 sm:p-10">
            <p className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
              {t({ en: 'Your request', ml: 'നിങ്ങളുടെ അപേക്ഷ' })}
            </p>
            <p className="mt-3 font-serif text-xl text-[rgb(var(--ink))]">
              {date
                ? `${formatDate(date, lang)} · ${t(hall.sessions.find((s) => s.id === session)?.label ?? { en: '', ml: '' })}`
                : t({ en: 'No day chosen yet', ml: 'ദിവസം തിരഞ്ഞെടുത്തിട്ടില്ല' })}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'Name', ml: 'പേര്' })}</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={field}
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'Phone', ml: 'ഫോൺ' })}</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={field}
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'Email', ml: 'ഇമെയിൽ' })}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={field}
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="eyebrow">{t({ en: 'Occasion', ml: 'അവസരം' })}</span>
                <input
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder={t({ en: 'Wedding reception, meeting…', ml: 'വിവാഹ സ്വീകരണം, യോഗം…' })}
                  className={field}
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
                  className={`${field} tabular-nums`}
                />
              </label>
            </div>

            <fieldset className="mt-8">
              <legend className="eyebrow">
                {t({ en: 'What will you need?', ml: 'എന്തൊക്കെ വേണം?' })}
              </legend>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {hall.amenities.map((amenity) => {
                  const on = amenities.includes(amenity.id)
                  return (
                    <label
                      key={amenity.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors duration-300',
                        on ? 'border-gold-400 bg-gold-400/10' : 'border-[rgb(var(--line))] hover:border-gold-300',
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
            </fieldset>

            <label className="mt-8 flex flex-col gap-2">
              <span className="eyebrow">{t({ en: 'Anything else', ml: 'മറ്റെന്തെങ്കിലും' })}</span>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className={`${field} resize-y`}
              />
            </label>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[rgb(var(--line))] pt-6">
              <div>
                <p className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  {t({ en: 'Indicative total', ml: 'ഏകദേശ തുക' })}
                </p>
                <p className="mt-1 font-display text-3xl text-[rgb(var(--ink))] tabular-nums">
                  ₹{formatNumber(rent + extras, lang)}
                </p>
                <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
                  {t({ en: 'Hall', ml: 'ഹാൾ' })} ₹{formatNumber(rent, lang)}
                  {extras ? ` + ${t({ en: 'extras', ml: 'അധികം' })} ₹${formatNumber(extras, lang)}` : ''}
                  {' · '}
                  {t({ en: 'advance', ml: 'അഡ്വാൻസ്' })} ₹{formatNumber(hall.booking.advance, lang)}
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
              <p className="mt-5 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">{error}</p>
            ) : null}

            <p className="mt-6 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
              {t(hall.booking.contact.hours)} · {hall.booking.contact.phone}
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
