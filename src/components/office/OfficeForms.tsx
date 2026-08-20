'use client'

import { useCallback, useEffect, useState } from 'react'

import { useLang } from '@/lib/i18n'
import type { OfficeContent } from '@/lib/types'
import { cn, formatDate, formatNumber, isEmail } from '@/lib/utils'

import { Honeypot } from '../ui/Honeypot'
import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'

type Kind = 'intentions' | 'certificates' | 'prayers'

type Sent = { id: string } | null

/** Shared state and posting for all three, since they differ only in what is asked. */
function useAsk(kind: Kind) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  const [sent, setSent] = useState<Sent>(null)
  const [website, setWebsite] = useState('')

  async function post(payload: Record<string, unknown>) {
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/office', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, kind, website }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'That did not go through')
      setSent({ id: String(json.id ?? '') })
      setStatus('sent')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not go through')
      setStatus('error')
      return false
    }
  }

  return { status, error, sent, website, setWebsite, post, setError, setStatus }
}

/** The card every one of these ends in. */
function Done({ id, children }: { id: string; children: React.ReactNode }) {
  const { t } = useLang()
  return (
    <div className="rounded-sm border border-gold-400/40 bg-gold-400/10 p-5">
      <p className="font-sans text-sm text-[rgb(var(--ink))]">{children}</p>
      {id ? (
        <p className="mt-3 border-t border-gold-400/30 pt-3 font-sans text-sm text-[rgb(var(--ink))]">
          {t({ en: 'Your reference', ml: 'നിങ്ങളുടെ റഫറൻസ്' })}{' '}
          <strong className="font-mono tracking-wider text-gold-700 dark:text-gold-300">{id}</strong>
        </p>
      ) : null}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: { en: string; ml: string }
  children: React.ReactNode
}) {
  const { t } = useLang()
  return (
    <label className="flex flex-col gap-2">
      <span className="eyebrow">{t(label)}</span>
      {children}
    </label>
  )
}

/* ------------------------------------------------------------------ a Mass */

export function MassIntentionForm({ office }: { office: OfficeContent }) {
  const { t, lang } = useLang()
  const ask = useAsk('intentions')
  const [taken, setTaken] = useState<string[]>([])
  const [form, setForm] = useState({
    type: office.intentions.types[0]?.id ?? '',
    date: '',
    subject: '',
    detail: '',
    name: '',
    phone: '',
    email: '',
  })

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/office', { cache: 'no-store' })
      const json = await res.json()
      setTaken(Array.isArray(json.taken) ? json.taken : [])
    } catch {
      setTaken([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // The office needs notice, and will not write a Mass in beyond its window.
  const first = new Date()
  first.setDate(first.getDate() + office.intentions.noticeDays)
  const last = new Date()
  last.setMonth(last.getMonth() + office.intentions.monthsAhead)
  const key = (at: Date) =>
    `${at.getFullYear()}-${`${at.getMonth() + 1}`.padStart(2, '0')}-${`${at.getDate()}`.padStart(2, '0')}`

  const clash = form.date && taken.includes(form.date)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.date || !form.subject.trim() || !form.name.trim()) {
      ask.setError(
        t({
          en: 'A day, who the Mass is for, and your name are all needed.',
          ml: 'ദിവസം, ആർക്കുവേണ്ടി, നിങ്ങളുടെ പേര് — മൂന്നും ആവശ്യമാണ്.',
        }),
      )
      ask.setStatus('error')
      return
    }
    if (await ask.post(form)) load()
  }

  const chosen = office.intentions.types.find((entry) => entry.id === form.type)

  return (
    <form onSubmit={submit} className="card relative p-7 sm:p-9">
      <Honeypot value={ask.website} onChange={ask.setWebsite} />

      {ask.status === 'sent' ? (
        <Done id={ask.sent?.id ?? ''}>
          {t({
            en: 'The parish office has your request. Somebody will telephone to say which Mass it has been written into.',
            ml: 'ഇടവക ഓഫീസിന് നിങ്ങളുടെ അപേക്ഷ ലഭിച്ചു. ഏത് കുർബാനയിലാണ് ചേർത്തതെന്ന് ആരെങ്കിലും വിളിച്ചറിയിക്കും.',
          })}
        </Done>
      ) : (
        <>
          <fieldset>
            <legend className="eyebrow">{t({ en: 'What is it for?', ml: 'എന്തിനുവേണ്ടി?' })}</legend>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {office.intentions.types.map((entry) => (
                <label
                  key={entry.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-colors duration-300',
                    form.type === entry.id
                      ? 'border-gold-400 bg-gold-400/10'
                      : 'border-[rgb(var(--line))] hover:border-gold-300',
                  )}
                >
                  <input
                    type="radio"
                    name="intention-type"
                    checked={form.type === entry.id}
                    onChange={() => setForm({ ...form, type: entry.id })}
                    className="mt-1 h-4 w-4 shrink-0 accent-gold-500"
                  />
                  <span className="min-w-0">
                    <span className="block font-sans text-sm font-medium text-[rgb(var(--ink))]">
                      {t(entry.label)}
                    </span>
                    <span className="block font-sans text-2xs text-[rgb(var(--muted))]">
                      {t(entry.note)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Field label={{ en: 'Which day', ml: 'ഏത് ദിവസം' }}>
              <input
                type="date"
                value={form.date}
                min={key(first)}
                max={key(last)}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="field"
                required
              />
            </Field>

            <Field
              label={
                chosen?.id === 'departed'
                  ? { en: 'In memory of', ml: 'ആരുടെ ഓർമ്മയ്ക്ക്' }
                  : { en: 'For whom', ml: 'ആർക്കുവേണ്ടി' }
              }
            >
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder={t({ en: 'Their name', ml: 'അവരുടെ പേര്' })}
                className="field"
                required
              />
            </Field>

            <Field label={{ en: 'Your name', ml: 'നിങ്ങളുടെ പേര്' }}>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="field"
                required
              />
            </Field>

            <Field label={{ en: 'Phone', ml: 'ഫോൺ' }}>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="field"
              />
            </Field>

            <Field label={{ en: 'Email (optional)', ml: 'ഇമെയിൽ (നിർബന്ധമല്ല)' }}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="field"
              />
            </Field>
          </div>

          <label className="mt-4 flex flex-col gap-2">
            <span className="eyebrow">
              {t({ en: 'Anything the priest should know', ml: 'വൈദികൻ അറിയേണ്ടത്' })}
            </span>
            <textarea
              rows={3}
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              className="field resize-y"
            />
          </label>

          {clash ? (
            <p className="mt-5 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
              {t({
                en: 'That day already has an intention. Please choose another.',
                ml: 'ആ ദിവസത്തിന് ഇതിനകം ഒരു നിയോഗമുണ്ട്. മറ്റൊരു ദിവസം തിരഞ്ഞെടുക്കുക.',
              })}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[rgb(var(--line))] pt-6">
            <p className="font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
              {t({ en: 'Customary offering', ml: 'പതിവ് കാഴ്ച' })} ₹
              {formatNumber(office.intentions.offering, lang)} ·{' '}
              {t({
                en: 'given at the office, and never a condition',
                ml: 'ഓഫീസിൽ നൽകാം, ഒരിക്കലും നിബന്ധനയല്ല',
              })}
            </p>

            <button
              type="submit"
              disabled={ask.status === 'sending' || Boolean(clash)}
              className="btn-primary"
            >
              {ask.status === 'sending'
                ? t({ en: 'Sending…', ml: 'അയയ്ക്കുന്നു…' })
                : t({ en: 'Ask for this Mass', ml: 'ഈ കുർബാന ആവശ്യപ്പെടുക' })}
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>

          {ask.status === 'error' && ask.error ? (
            <p className="mt-5 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
              {ask.error}
            </p>
          ) : null}
        </>
      )}
    </form>
  )
}

/* ----------------------------------------------------------- a certificate */

export function CertificateForm({ office }: { office: OfficeContent }) {
  const { t, lang } = useLang()
  const ask = useAsk('certificates')
  const [form, setForm] = useState({
    type: office.certificates.types[0]?.id ?? '',
    subject: '',
    detail: '',
    name: '',
    phone: '',
    email: '',
  })

  const chosen = office.certificates.types.find((entry) => entry.id === form.type)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.subject.trim() || !form.name.trim()) {
      ask.setError(
        t({
          en: 'The name it should be made out in, and your own name, are both needed.',
          ml: 'സാക്ഷ്യപത്രത്തിലെ പേരും നിങ്ങളുടെ പേരും ആവശ്യമാണ്.',
        }),
      )
      ask.setStatus('error')
      return
    }
    if (!form.phone.trim() && !isEmail(form.email)) {
      ask.setError(
        t({
          en: 'Leave a telephone number or an email address so the office can reply.',
          ml: 'ഓഫീസിന് മറുപടി നൽകാൻ ഫോൺ നമ്പറോ ഇമെയിലോ നൽകുക.',
        }),
      )
      ask.setStatus('error')
      return
    }
    ask.post(form)
  }

  return (
    <form onSubmit={submit} className="card relative p-7 sm:p-9">
      <Honeypot value={ask.website} onChange={ask.setWebsite} />

      {ask.status === 'sent' ? (
        <Done id={ask.sent?.id ?? ''}>
          {t({
            en: `The office has your request. It is usually ready within ${office.certificates.days} working days — bring proof of who you are when you collect it.`,
            ml: `ഓഫീസിന് അപേക്ഷ ലഭിച്ചു. സാധാരണ ${office.certificates.days} പ്രവൃത്തിദിവസത്തിനുള്ളിൽ തയ്യാറാകും — വാങ്ങാൻ വരുമ്പോൾ തിരിച്ചറിയൽ രേഖ കൊണ്ടുവരിക.`,
          })}
        </Done>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={{ en: 'Which certificate', ml: 'ഏത് സാക്ഷ്യപത്രം' }}>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="field"
              >
                {office.certificates.types.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {t(entry.label)} — ₹{formatNumber(entry.fee, lang)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={{ en: 'In whose name', ml: 'ആരുടെ പേരിൽ' }}>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="field"
                required
              />
            </Field>
          </div>

          {chosen ? (
            <p className="mt-3 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
              {t({ en: 'The office will need', ml: 'ഓഫീസിന് വേണ്ടത്' })}: {t(chosen.needs)}
            </p>
          ) : null}

          <label className="mt-6 flex flex-col gap-2">
            <span className="eyebrow">
              {t({ en: 'What you know', ml: 'നിങ്ങൾക്കറിയാവുന്നത്' })}
            </span>
            <textarea
              rows={3}
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              placeholder={t({
                en: 'The year, the family unit, anything that helps find the entry',
                ml: 'വർഷം, കുടുംബക്കൂട്ടായ്മ, രേഖ കണ്ടെത്താൻ സഹായിക്കുന്നതെന്തും',
              })}
              className="field resize-y"
            />
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Field label={{ en: 'Your name', ml: 'നിങ്ങളുടെ പേര്' }}>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="field"
                required
              />
            </Field>
            <Field label={{ en: 'Phone', ml: 'ഫോൺ' }}>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="field"
              />
            </Field>
            <Field label={{ en: 'Email', ml: 'ഇമെയിൽ' }}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="field"
              />
            </Field>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[rgb(var(--line))] pt-6">
            <p className="font-sans text-2xs text-[rgb(var(--muted))]">
              {chosen
                ? `${t({ en: 'Fee', ml: 'ഫീസ്' })} ₹${formatNumber(chosen.fee, lang)} · ${t({ en: 'paid at the office', ml: 'ഓഫീസിൽ അടയ്ക്കുക' })}`
                : ''}
            </p>
            <button type="submit" disabled={ask.status === 'sending'} className="btn-primary">
              {ask.status === 'sending'
                ? t({ en: 'Sending…', ml: 'അയയ്ക്കുന്നു…' })
                : t({ en: 'Send the request', ml: 'അപേക്ഷ അയയ്ക്കുക' })}
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>

          {ask.status === 'error' && ask.error ? (
            <p className="mt-5 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
              {ask.error}
            </p>
          ) : null}
        </>
      )}
    </form>
  )
}

/* --------------------------------------------------------------- a prayer */

export function PrayerForm({ office }: { office: OfficeContent }) {
  const { t } = useLang()
  const ask = useAsk('prayers')
  const [form, setForm] = useState({ detail: '', name: '', phone: '', email: '' })
  const [mayPublish, setMayPublish] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.detail.trim() || !form.name.trim()) {
      ask.setError(
        t({
          en: 'Write what you would like prayed for, and give a name we may call you by.',
          ml: 'എന്തിനുവേണ്ടി പ്രാർത്ഥിക്കണമെന്ന് എഴുതുക, വിളിക്കാൻ ഒരു പേരും നൽകുക.',
        }),
      )
      ask.setStatus('error')
      return
    }
    ask.post({ ...form, mayPublish })
  }

  return (
    <form onSubmit={submit} className="card relative p-7 sm:p-9">
      <Honeypot value={ask.website} onChange={ask.setWebsite} />

      {ask.status === 'sent' ? (
        <Done id={ask.sent?.id ?? ''}>
          {t({
            en: 'It has reached the parish. It will be prayed for at Mass and by the parish prayer group.',
            ml: 'അത് ഇടവകയിൽ എത്തി. കുർബാനയിലും ഇടവക പ്രാർത്ഥനാ സംഘത്തിലും ഇതിനുവേണ്ടി പ്രാർത്ഥിക്കും.',
          })}
        </Done>
      ) : (
        <>
          <label className="flex flex-col gap-2">
            <span className="eyebrow">
              {t({ en: 'What shall we pray for?', ml: 'എന്തിനുവേണ്ടി പ്രാർത്ഥിക്കണം?' })}
            </span>
            <textarea
              rows={5}
              value={form.detail}
              onChange={(e) => setForm({ ...form, detail: e.target.value })}
              className="field resize-y"
              required
            />
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Field label={{ en: 'Your name', ml: 'നിങ്ങളുടെ പേര്' }}>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="field"
                required
              />
            </Field>
            <Field label={{ en: 'Phone (optional)', ml: 'ഫോൺ (നിർബന്ധമല്ല)' }}>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="field"
              />
            </Field>
            <Field label={{ en: 'Email (optional)', ml: 'ഇമെയിൽ (നിർബന്ധമല്ല)' }}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="field"
              />
            </Field>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-sm border border-[rgb(var(--line))] p-4">
            <input
              type="checkbox"
              checked={mayPublish}
              onChange={(e) => setMayPublish(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-gold-500"
            />
            <span className="min-w-0">
              <span className="block font-sans text-sm text-[rgb(var(--ink))]">
                {t({
                  en: 'The parish may print this in the notices',
                  ml: 'ഇടവകയ്ക്ക് ഇത് അറിയിപ്പുകളിൽ ചേർക്കാം',
                })}
              </span>
              <span className="mt-0.5 block font-sans text-2xs text-[rgb(var(--muted))]">
                {t({
                  en: 'Leave this unticked and only the priest and the prayer group will see it.',
                  ml: 'ഇത് തിരഞ്ഞെടുത്തില്ലെങ്കിൽ വൈദികനും പ്രാർത്ഥനാ സംഘവും മാത്രമേ കാണൂ.',
                })}
              </span>
            </span>
          </label>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-[rgb(var(--line))] pt-6">
            <p className="font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
              {t(office.prayers.note)}
            </p>
            <button type="submit" disabled={ask.status === 'sending'} className="btn-primary">
              {ask.status === 'sending'
                ? t({ en: 'Sending…', ml: 'അയയ്ക്കുന്നു…' })
                : t({ en: 'Send it', ml: 'അയയ്ക്കുക' })}
              <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>

          {ask.status === 'error' && ask.error ? (
            <p className="mt-5 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
              {ask.error}
            </p>
          ) : null}
        </>
      )}
    </form>
  )
}

/* ----------------------------------------------------------- the whole page */

export function OfficeSections({ office }: { office: OfficeContent }) {
  const { t } = useLang()

  const blocks = [
    {
      id: 'intentions',
      eyebrow: { en: '01 · Holy Mass', ml: '01 · വിശുദ്ധ കുർബാന' },
      heading: office.intentions.title,
      blurb: office.intentions.blurb,
      rules: office.intentions.rules,
      form: <MassIntentionForm office={office} />,
      alt: false,
    },
    {
      id: 'certificates',
      eyebrow: { en: '02 · Certificates', ml: '02 · സാക്ഷ്യപത്രങ്ങൾ' },
      heading: office.certificates.title,
      blurb: office.certificates.blurb,
      rules: office.certificates.rules,
      form: <CertificateForm office={office} />,
      alt: true,
    },
    {
      id: 'prayers',
      eyebrow: { en: '03 · Prayer', ml: '03 · പ്രാർത്ഥന' },
      heading: office.prayers.title,
      blurb: office.prayers.blurb,
      rules: [],
      form: <PrayerForm office={office} />,
      alt: false,
    },
  ]

  return (
    <>
      {blocks.map((block) => (
        <section
          key={block.id}
          id={block.id}
          className={cn(
            'hall-anchor section-tight',
            block.alt ? 'bg-[rgb(var(--page-alt))]' : 'bg-[rgb(var(--page))]',
          )}
        >
          <div className="container">
            <SectionHeading eyebrow={block.eyebrow} title={block.heading} subtitle={block.blurb} />

            <div className="mx-auto mt-12 max-w-3xl">{block.form}</div>

            {block.rules.length ? (
              <Reveal delay={0.1}>
                <ul className="mx-auto mt-8 flex max-w-3xl flex-col gap-3">
                  {block.rules.map((rule) => (
                    <li key={rule.en} className="flex gap-3">
                      <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-gold-500" />
                      <span className="font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                        {t(rule)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}
          </div>
        </section>
      ))}
    </>
  )
}
