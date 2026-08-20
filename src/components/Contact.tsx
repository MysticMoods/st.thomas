'use client'

import { useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { SiteContent } from '@/lib/types'
import { cn, isEmail, telHref } from '@/lib/utils'

import { Honeypot } from './ui/Honeypot'
import { Icon } from './ui/Icon'
import { Reveal } from './ui/Reveal'
import { SectionHeading } from './ui/SectionHeading'
import { SocialRow } from './SocialRow'

type State = 'idle' | 'sending' | 'done' | 'error'

export function Contact({ site }: { site: SiteContent }) {
  const { t } = useLang()
  const [state, setState] = useState<State>('idle')
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  // Filled only by something that cannot see the page.
  const [website, setWebsite] = useState('')

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !isEmail(form.email) || !form.message.trim()) {
      setState('error')
      return
    }
    setState('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, website }),
      })
      if (!res.ok) throw new Error('failed')
      setState('done')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch {
      setState('error')
    }
  }

  return (
    <section id="contact" className="section bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'Visit & Contact', ml: 'സന്ദർശനവും ബന്ധപ്പെടലും' }}
          title={{ en: 'Come and see', ml: 'വന്ന് കാണുക' }}
          subtitle={{
            en: 'The church stands open from six in the morning until eight at night, every day of the year.',
            ml: 'വർഷത്തിലെ എല്ലാ ദിവസവും രാവിലെ ആറു മുതൽ രാത്രി എട്ടു വരെ ദേവാലയം തുറന്നിരിക്കുന്നു.',
          }}
        />

        <div className="mt-20 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12">
          {/* details */}
          <Reveal>
            <div className="flex h-full flex-col gap-8">
              <div className="card p-8 sm:p-9">
                <h3 className="flex items-center gap-3 font-display text-xl text-[rgb(var(--ink))]">
                  <Icon name="mapPin" className="h-5 w-5 text-gold-500" />
                  {t(ui.contact.address)}
                </h3>
                <p className="mt-4 font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
                  {t(site.contact.address)}
                </p>
                <a
                  href={site.contact.mapLink}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group mt-5 inline-flex items-center gap-2 font-sans text-2xs font-semibold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400"
                >
                  {t(ui.common.directions)}
                  <Icon
                    name="arrowRight"
                    className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </a>

                <dl className="mt-8 grid gap-4 border-t border-[rgb(var(--line))] pt-7 sm:grid-cols-2">
                  <div>
                    <dt className="font-sans text-2xs uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                      {t(ui.common.call)}
                    </dt>
                    <dd className="mt-1.5">
                      <a
                        href={telHref(site.contact.phone)}
                        className="font-serif text-lg text-[rgb(var(--ink))] transition-colors hover:text-gold-600"
                      >
                        {site.contact.phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-sans text-2xs uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                      {t(ui.common.email)}
                    </dt>
                    <dd className="mt-1.5">
                      <a
                        href={`mailto:${site.contact.email}`}
                        className="break-words font-serif text-base text-[rgb(var(--ink))] transition-colors hover:text-gold-600"
                      >
                        {site.contact.email}
                      </a>
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-sans text-2xs uppercase tracking-[0.18em] text-burgundy-600 dark:text-burgundy-300">
                      {t(ui.contact.emergency)}
                    </dt>
                    <dd className="mt-1.5">
                      <a
                        href={telHref(site.contact.emergency)}
                        className="font-serif text-lg text-[rgb(var(--ink))] transition-colors hover:text-burgundy-500"
                      >
                        {site.contact.emergency}
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="card p-8 sm:p-9">
                <h3 className="flex items-center gap-3 font-display text-xl text-[rgb(var(--ink))]">
                  <Icon name="clock" className="h-5 w-5 text-gold-500" />
                  {t(ui.contact.officeHours)}
                </h3>
                <dl className="mt-5 divide-y divide-[rgb(var(--line))]">
                  {site.contact.officeHours.map((row) => (
                    <div key={t(row.days)} className="flex flex-wrap justify-between gap-2 py-3.5">
                      <dt className="font-sans text-sm font-medium text-[rgb(var(--ink))]">
                        {t(row.days)}
                      </dt>
                      <dd className="font-sans text-sm text-[rgb(var(--muted))]">{t(row.hours)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="card flex-1 overflow-hidden">
                <iframe
                  src={site.contact.mapEmbed}
                  title="Parish location map"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-72 w-full border-0 grayscale-[0.35] transition-[filter] duration-700 hover:grayscale-0 lg:h-full lg:min-h-[18rem]"
                />
              </div>
            </div>
          </Reveal>

          {/* form */}
          <Reveal direction="left" delay={0.1}>
            <div className="card h-full p-8 sm:p-10">
              <h3 className="heading-md">{t(ui.contact.heading)}</h3>
              <span className="mt-5 block gold-rule w-14" aria-hidden="true" />

              <form onSubmit={submit} className="relative mt-8 flex flex-col gap-5">
                <Honeypot value={website} onChange={setWebsite} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={t(ui.contact.name)} htmlFor="c-name">
                    <input
                      id="c-name"
                      className="field"
                      value={form.name}
                      onChange={update('name')}
                      required
                      autoComplete="name"
                    />
                  </Field>
                  <Field label={t(ui.contact.email)} htmlFor="c-email">
                    <input
                      id="c-email"
                      type="email"
                      className="field"
                      value={form.email}
                      onChange={update('email')}
                      required
                      autoComplete="email"
                    />
                  </Field>
                  <Field label={t(ui.contact.phone)} htmlFor="c-phone">
                    <input
                      id="c-phone"
                      type="tel"
                      className="field"
                      value={form.phone}
                      onChange={update('phone')}
                      autoComplete="tel"
                    />
                  </Field>
                  <Field label={t(ui.contact.subject)} htmlFor="c-subject">
                    <input
                      id="c-subject"
                      className="field"
                      value={form.subject}
                      onChange={update('subject')}
                    />
                  </Field>
                </div>

                <Field label={t(ui.contact.message)} htmlFor="c-message">
                  <textarea
                    id="c-message"
                    rows={6}
                    className="field resize-y"
                    value={form.message}
                    onChange={update('message')}
                    required
                  />
                </Field>

                <button type="submit" disabled={state === 'sending'} className="btn-outline self-start">
                  <Icon name="mail" className="h-4 w-4" />
                  {t(state === 'sending' ? ui.contact.sending : ui.contact.send)}
                </button>

                <p
                  aria-live="polite"
                  className={cn(
                    'font-sans text-2xs leading-relaxed',
                    state === 'done' && 'text-gold-600 dark:text-gold-300',
                    state === 'error' && 'text-burgundy-500 dark:text-burgundy-300',
                    (state === 'idle' || state === 'sending') && 'text-[rgb(var(--muted))]',
                  )}
                >
                  {state === 'done'
                    ? t(ui.contact.sent)
                    : state === 'error'
                      ? t(ui.contact.failed)
                      : t({
                          en: 'Messages reach the parish office directly. Nothing is published on this site.',
                          ml: 'സന്ദേശങ്ങൾ നേരിട്ട് ഇടവക ഓഫീസിൽ എത്തുന്നു. ഒന്നും ഈ സൈറ്റിൽ പ്രസിദ്ധീകരിക്കുന്നില്ല.',
                        })}
                </p>
              </form>

              <div className="mt-10 border-t border-[rgb(var(--line))] pt-8">
                <span className="eyebrow">{t(ui.footer.followUs)}</span>
                <SocialRow social={site.social} className="mt-5" />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
