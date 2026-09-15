'use client'

import { useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import type { SiteContent } from '@/lib/types'
import { cn, isEmail } from '@/lib/utils'

import { Honeypot } from './ui/Honeypot'
import { Icon } from './ui/Icon'
import { Reveal } from './ui/Reveal'
import { SmartImage } from './ui/SmartImage'

type State = 'idle' | 'sending' | 'done' | 'error'

export function Newsletter({ site }: { site: SiteContent }) {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  // Filled only by something that cannot see the page.
  const [website, setWebsite] = useState('')
  const [state, setState] = useState<State>('idle')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!isEmail(email)) {
      setState('error')
      return
    }
    setState('sending')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website }),
      })
      setState(res.ok ? 'done' : 'error')
      if (res.ok) setEmail('')
    } catch {
      setState('error')
    }
  }

  return (
    <section id="newsletter" className="section-tight bg-[rgb(var(--page-alt))]">
      <div className="container">
        <Reveal>
          <div className="grid overflow-hidden rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
            <SmartImage
              src={site.newsletter.image}
              alt=""
              width={1200}
              height={800}
              sizes="(max-width: 1024px) 100vw, 45vw"
              wrapperClassName="aspect-[16/9] w-full lg:aspect-auto lg:h-full"
              className="h-full w-full object-cover"
            />

            <div className="flex flex-col justify-center gap-6 p-9 sm:p-12 lg:p-14">
              <span className="eyebrow">{t({ en: 'Newsletter', ml: 'വാർത്താക്കുറിപ്പ്' })}</span>
              <h2 className="heading-md">{t(site.newsletter.title)}</h2>
              <span className="gold-rule w-14" aria-hidden="true" />
              <p className="body-text">{t(site.newsletter.description)}</p>

              <form onSubmit={submit} className="relative mt-1 flex flex-col gap-3 sm:flex-row">
                <Honeypot value={website} onChange={setWebsite} />
                <label className="sr-only" htmlFor="newsletter-email">
                  {t(ui.contact.email)}
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (state === 'error') setState('idle')
                  }}
                  placeholder={t(ui.newsletter.placeholder)}
                  className={cn('field flex-1', state === 'error' && 'border-burgundy-500')}
                />
                <button type="submit" disabled={state === 'sending'} className="btn-outline">
                  {state === 'sending' ? (
                    <Icon name="sparkle" className="h-4 w-4 animate-pulse" />
                  ) : (
                    <Icon name="mail" className="h-4 w-4" />
                  )}
                  {t(ui.newsletter.subscribe)}
                </button>
              </form>

              <p
                aria-live="polite"
                className={cn(
                  'font-sans text-2xs',
                  state === 'done' && 'text-gold-600 dark:text-gold-300',
                  state === 'error' && 'text-burgundy-500 dark:text-burgundy-300',
                  (state === 'idle' || state === 'sending') && 'text-[rgb(var(--muted))]',
                )}
              >
                {state === 'done'
                  ? t(ui.newsletter.success)
                  : state === 'error'
                    ? t(ui.newsletter.error)
                    : t(ui.newsletter.privacy)}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
