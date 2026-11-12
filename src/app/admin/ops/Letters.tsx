'use client'

import { useCallback, useEffect, useState } from 'react'

import { Empty, Loading, Panel, Pill, Problem, when } from './Panel'

type Sent = {
  id: string
  at: string
  to: string
  subject: string
  kind: string
  status: 'sent' | 'failed' | 'not-configured'
  error?: string
}

type Payload = {
  letters: Sent[]
  configured: boolean
  counts: { sent: number; failed: number; undelivered: number }
  check?: { ok: boolean; error?: string }
}

/** Plain words for what each letter was. */
const WORDS: Record<string, string> = {
  'contact-office': 'message forwarded to the office',
  'contact-ack': 'acknowledgement to the sender',
  'hall-office': 'hall request to the office',
  'hall-ack': 'hall acknowledgement to the family',
  'hall-confirmed': 'booking confirmed',
  'hall-declined': 'booking declined',
  'donation-receipt': 'donation receipt',
}

/**
 * Every letter the site has tried to post.
 *
 * The parish needs to be able to answer "did she actually get it?" without
 * taking anybody's word for it, and to see at a glance when the mail settings
 * have quietly stopped working.
 */
export function Letters() {
  const [data, setData] = useState<Payload | null>(null)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (check = false) => {
    try {
      const res = await fetch(`/api/admin/outbox${check ? '?check=1' : ''}`, { cache: 'no-store' })
      setData(await res.json())
    } catch {
      setError('Could not read the outbox')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!data) {
    return (
      <Panel title="Letters sent" blurb="Everything the site has posted, and whether it arrived.">
        <Loading rows={4} />
      </Panel>
    )
  }

  return (
    <Panel
      title="Letters sent"
      blurb={`${data.counts.sent} delivered · ${data.counts.failed} failed · ${data.counts.undelivered} never posted.`}
      actions={
        <>
          <button
            type="button"
            disabled={checking}
            onClick={async () => {
              setChecking(true)
              await load(true)
              setChecking(false)
            }}
            className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 disabled:opacity-50"
          >
            {checking ? 'Testing…' : 'Test the connection'}
          </button>
          {data.letters.length > 0 ? (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Clear the list of letters sent?')) return
                await fetch('/api/admin/outbox', { method: 'DELETE' })
                load()
              }}
              className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500"
            >
              Clear
            </button>
          ) : null}
        </>
      }
    >
      <Problem>{error}</Problem>

      {!data.configured ? (
        <div className="mb-6 rounded-sm border border-burgundy-400/50 bg-burgundy-500/10 px-5 py-4">
          <p className="font-sans text-sm text-[rgb(var(--ink))]">
            No mail server is set up, so <strong>nothing below was actually delivered</strong>.
          </p>
          <p className="mt-2 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
            Set <code>MAIL_HOST</code>, <code>MAIL_FROM</code> and, if the server needs them,{' '}
            <code>MAIL_USER</code> and <code>MAIL_PASS</code> in <code>.env.local</code>, then
            restart. Requests and messages are still being saved either way — nothing has been
            lost, and the letters below are exactly what will go out once it works.
          </p>
        </div>
      ) : null}

      {data.check ? (
        <p
          className={
            data.check.ok
              ? 'mb-6 rounded-sm border border-gold-400/50 bg-gold-400/10 px-5 py-3 font-sans text-sm text-[rgb(var(--ink))]'
              : 'mb-6 rounded-sm border border-burgundy-400/50 bg-burgundy-500/10 px-5 py-3 font-sans text-sm text-burgundy-600 dark:text-burgundy-300'
          }
        >
          {data.check.ok
            ? 'The mail server answered. Letters will be delivered.'
            : `The mail server would not take it: ${data.check.error}`}
        </p>
      ) : null}

      {data.letters.length === 0 ? (
        <Empty>Nothing has been posted yet.</Empty>
      ) : (
        <ul className="divide-y divide-[rgb(var(--line))]">
          {data.letters.map((letter) => (
            <li key={letter.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
              <span className="w-44 shrink-0 font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                {when(letter.at)}
              </span>
              <span className="font-sans text-sm text-[rgb(var(--ink))]">{letter.to}</span>
              <span className="font-sans text-2xs text-[rgb(var(--muted))]">
                {WORDS[letter.kind] ?? letter.kind}
              </span>
              {letter.error ? (
                <span className="font-sans text-2xs text-burgundy-600 dark:text-burgundy-300">
                  — {letter.error}
                </span>
              ) : null}
              <span className="ml-auto">
                <Pill
                  tone={
                    letter.status === 'sent' ? 'good' : letter.status === 'failed' ? 'bad' : 'warn'
                  }
                >
                  {letter.status === 'not-configured' ? 'not posted' : letter.status}
                </Pill>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
