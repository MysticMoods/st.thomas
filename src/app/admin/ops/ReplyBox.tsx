'use client'

import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { MAX_REPLY, type Reply, recordKey, whatsappLink } from '@/lib/reply'
import { cn } from '@/lib/utils'

/**
 * Answering somebody without leaving the page their message is on.
 *
 * Two buttons, because a parish reaches people two ways. Email goes through the
 * site and is recorded whether or not it arrived. WhatsApp opens on the parish's
 * own number with the answer already typed — the office presses send there, so
 * the family gets it from a number they recognise and can reply to.
 *
 * Either way the answer stays here underneath the message, so nobody writes
 * back twice and anybody can see what was said.
 */

type Target = {
  id?: string
  at: string
  name: string
  email?: string
  phone?: string
  subject?: string
  replies?: Reply[]
}

const STATUS_WORDS: Record<Reply['status'], string> = {
  sent: 'sent',
  failed: 'failed to send',
  'not-configured': 'written, but no mail server is set up',
  'handed-over': 'opened in WhatsApp',
}

export function ReplyBox({
  list,
  target,
  onDone,
}: {
  list: 'messages' | 'hall-bookings' | 'intentions' | 'certificates' | 'prayers'
  target: Target
  onDone?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<'' | 'email' | 'whatsapp'>('')
  const [note, setNote] = useState('')

  const replies = target.replies ?? []
  const wa = target.phone ? whatsappLink(target.phone, text || ' ') : ''

  async function record(channel: 'email' | 'whatsapp') {
    setBusy(channel)
    setNote('')
    try {
      const res = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list, key: recordKey(target), text, channel }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not send that')
      setText('')
      setOpen(false)
      setNote(
        json.reply?.status === 'sent'
          ? 'Sent.'
          : json.reply?.status === 'not-configured'
            ? 'Written down, but no mail server is set up yet — nothing was delivered.'
            : json.reply?.status === 'failed'
              ? `The mail server refused it: ${json.reply?.error ?? 'no reason given'}`
              : 'Noted here. Press send in WhatsApp.',
      )
      onDone?.()
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not send that')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="mt-3 border-t border-dashed border-[rgb(var(--line))] pt-3">
      {replies.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {replies.map((reply, i) => (
            <li
              key={i}
              className="rounded-sm border-l-2 border-gold-400/60 bg-gold-400/5 px-3 py-2"
            >
              <p className="font-sans text-2xs text-[rgb(var(--muted))]">
                {reply.by} · {new Date(reply.at).toLocaleString('en-IN')} ·{' '}
                {reply.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} —{' '}
                <span
                  className={cn(
                    reply.status === 'sent' && 'text-emerald-600 dark:text-emerald-400',
                    reply.status === 'failed' && 'text-burgundy-600 dark:text-burgundy-300',
                  )}
                >
                  {STATUS_WORDS[reply.status]}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap font-sans text-sm text-[rgb(var(--ink))]">
                {reply.text}
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      {note ? (
        <p className="mb-2 font-sans text-2xs text-[rgb(var(--muted))]">{note}</p>
      ) : null}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-sm border border-[rgb(var(--line))] px-3 py-1.5 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 hover:text-gold-600 dark:hover:text-gold-300"
        >
          <Icon name="mail" className="h-3.5 w-3.5" />
          {replies.length ? 'Write again' : 'Reply'}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            autoFocus
            rows={4}
            maxLength={MAX_REPLY}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Dear ${target.name || 'friend'},`}
            className="w-full rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--page))] px-3 py-2.5 font-sans text-sm leading-relaxed text-[rgb(var(--ink))] outline-none focus:border-gold-400"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!target.email || text.trim().length < 2 || busy !== ''}
              onClick={() => record('email')}
              title={target.email ? `Email ${target.email}` : 'No email address was left'}
              className="inline-flex items-center gap-1.5 rounded-sm bg-gold-400 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 transition-colors hover:bg-gold-300 disabled:opacity-50"
            >
              <Icon name="mail" className="h-3.5 w-3.5" />
              {busy === 'email' ? 'Sending…' : 'Send email'}
            </button>

            <button
              type="button"
              disabled={!wa || text.trim().length < 2 || busy !== ''}
              onClick={() => {
                // Opened first: a browser only allows this while the click that
                // asked for it is still being handled.
                window.open(wa, '_blank', 'noopener')
                void record('whatsapp')
              }}
              title={
                target.phone
                  ? `Open WhatsApp to ${target.phone}`
                  : 'No telephone number was left'
              }
              className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-500/50 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition-colors hover:bg-emerald-500/10 disabled:opacity-50 dark:text-emerald-400"
            >
              <Icon name="whatsapp" className="h-3.5 w-3.5" />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setText('')
              }}
              className="rounded-sm px-3 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:text-[rgb(var(--ink))]"
            >
              Cancel
            </button>

            <span className="ml-auto font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
              {text.length}/{MAX_REPLY}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
