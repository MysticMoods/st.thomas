'use client'

import { useCallback, useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'

import { Loading, Panel, Problem } from './Panel'

type Payload = { subscribers: number; configured: boolean; addresses: string[] }

/**
 * Writing to the people who asked for parish news.
 *
 * The site has been collecting addresses since it opened and had no way to
 * write to any of them. Every letter carries a working unsubscribe link — not
 * as a courtesy but because a list you cannot leave is one nobody should have
 * joined.
 */
export function NewsletterPanel() {
  const [data, setData] = useState<Payload | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [testTo, setTestTo] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/newsletter', { cache: 'no-store' })
      setData(await res.json())
    } catch {
      setData({ subscribers: 0, configured: false, addresses: [] })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function post(payload: Record<string, unknown>, what: string) {
    setBusy(what)
    setError('')
    setDone('')
    try {
      const res = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'That did not work')
      setDone(
        json.test
          ? `Test letter posted to ${testTo}.`
          : `Posted to ${json.sent} of ${json.total}${json.failed ? `, ${json.failed} would not go` : ''}.`,
      )
      if (!json.test) {
        setSubject('')
        setBody('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work')
    } finally {
      setBusy('')
    }
  }

  if (!data) {
    return (
      <Panel title="Newsletter" blurb="Write to everybody who asked for parish news.">
        <Loading rows={3} />
      </Panel>
    )
  }

  return (
    <Panel
      title="Newsletter"
      blurb={`${data.subscribers} ${data.subscribers === 1 ? 'person is' : 'people are'} on the list.`}
    >
      <Problem>{error}</Problem>

      {!data.configured ? (
        <p className="mb-6 rounded-sm border border-burgundy-400/50 bg-burgundy-500/10 px-5 py-3 font-sans text-sm text-[rgb(var(--ink))]">
          No mail server is set up, so nothing will actually be delivered. See{' '}
          <strong>Letters sent</strong> for what to set.
        </p>
      ) : null}

      {done ? (
        <p className="mb-6 rounded-sm border border-gold-400/50 bg-gold-400/10 px-5 py-3 font-sans text-sm text-[rgb(var(--ink))]">
          {done}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
            Subject
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Holy Week timings"
            className="field"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
            The letter
          </span>
          <textarea
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              'Write it as you would say it.\n\nLeave a blank line between paragraphs.\n\nThe parish name, the website address and the unsubscribe link are added at the foot of every letter.'
            }
            className="field resize-y font-serif leading-relaxed"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-[rgb(var(--line))] pt-6">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
          <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
            Send one to yourself first
          </span>
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="field"
          />
        </label>

        <button
          type="button"
          disabled={!!busy || !testTo || !subject || body.length < 20}
          onClick={() => post({ subject, body, testTo }, 'test')}
          className="rounded-sm border border-[rgb(var(--line))] px-5 py-3 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 disabled:opacity-40"
        >
          {busy === 'test' ? 'Posting…' : 'Send the test'}
        </button>

        <button
          type="button"
          disabled={!!busy || !subject || body.length < 20 || data.subscribers === 0}
          onClick={() => {
            if (
              !window.confirm(
                `Send this to all ${data.subscribers} people on the list? It cannot be called back.`,
              )
            ) {
              return
            }
            post({ subject, body }, 'send')
          }}
          className="btn-primary"
        >
          {busy === 'send' ? 'Posting…' : `Send to all ${data.subscribers}`}
          <Icon name="mail" className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-6 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
        Every letter carries a link to stop receiving them, and an address that has used it is never
        written to again. Addresses are never passed to anybody else.
        {data.addresses.length > 0 ? (
          <>
            {' '}
            First on the list: {data.addresses.slice(0, 3).join(', ')}
            {data.subscribers > 3 ? ` and ${data.subscribers - 3} more` : ''}.
          </>
        ) : null}
      </p>
    </Panel>
  )
}
