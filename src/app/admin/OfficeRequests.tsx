'use client'

import { useCallback, useEffect, useState } from 'react'

import type { Reply } from '@/lib/reply'
import { cn } from '@/lib/utils'

import { ReplyBox } from './ops/ReplyBox'

type Ask = {
  id: string
  kind: 'intentions' | 'certificates' | 'prayers'
  status: 'pending' | 'done' | 'declined'
  type: string
  date?: string
  subject: string
  detail: string
  name: string
  phone: string
  email: string
  mayPublish?: boolean
  at: string
  note?: string
  replies?: Reply[]
}

const TABS = [
  { key: 'intentions' as const, name: 'Mass intentions' },
  { key: 'certificates' as const, name: 'Certificates' },
  { key: 'prayers' as const, name: 'Prayer requests' },
]

function when(iso?: string) {
  if (!iso) return ''
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * The three queues at the parish office counter, in one place.
 *
 * Marking a certificate done writes to the person who asked, saying it is on
 * its way — which is the whole point of taking the request online rather than
 * making them come twice.
 *
 * The certificate itself never passes through this site. It is copied from the
 * register, scanned, and sent from the office's own WhatsApp or mail programme
 * with the **Mail app · attach** button in the reply box. A scan of somebody's
 * baptism entry has no business sitting in a web server's uploads folder.
 */
export function OfficeRequests() {
  const [tab, setTab] = useState<'intentions' | 'certificates' | 'prayers'>('intentions')
  const [data, setData] = useState<Record<string, Ask[]> | null>(null)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/office', { cache: 'no-store' })
      setData(await res.json())
    } catch {
      setData({ intentions: [], certificates: [], prayers: [] })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function decide(ask: Ask, status: Ask['status']) {
    const note =
      status === 'done' && ask.kind !== 'prayers'
        ? window.prompt('Anything to tell them? (optional — it goes in the email)') ?? ''
        : ''
    setBusy(ask.id)
    try {
      await fetch('/api/admin/office', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: ask.kind, id: ask.id, status, note }),
      })
      await load()
    } finally {
      setBusy('')
    }
  }

  async function remove(ask: Ask) {
    if (!window.confirm(`Remove this request from ${ask.name}?`)) return
    setBusy(ask.id)
    try {
      await fetch('/api/admin/office', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: ask.kind, id: ask.id }),
      })
      await load()
    } finally {
      setBusy('')
    }
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-sm" />
        ))}
      </div>
    )
  }

  const all = data[tab] ?? []
  const shown = filter === 'all' ? all : all.filter((ask) => ask.status === 'pending')

  return (
    <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(var(--line))] px-6 py-5">
        <div>
          <h1 className="font-display text-2xl text-[rgb(var(--ink))]">Parish office requests</h1>
          <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
            Marking a certificate done writes to say it is on its way. Send the
            certificate itself from WhatsApp, or with <strong>Mail app · attach</strong>
            — it is never uploaded here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['pending', 'all'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                'rounded-sm border px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] transition-colors',
                filter === key
                  ? 'border-gold-400 bg-gold-400/10 text-gold-700 dark:text-gold-300'
                  : 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-400',
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[rgb(var(--line))] px-6 py-4">
        {TABS.map((entry) => {
          const waiting = (data[entry.key] ?? []).filter((ask) => ask.status === 'pending').length
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              aria-pressed={tab === entry.key}
              className={cn(
                'rounded-sm border px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] transition-colors',
                tab === entry.key
                  ? 'border-gold-400 bg-gold-400/10 text-gold-700 dark:text-gold-300'
                  : 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-400',
              )}
            >
              {entry.name}
              {waiting ? ` · ${waiting}` : ''}
            </button>
          )
        })}
      </div>

      <div className="p-6">
        {shown.length === 0 ? (
          <p className="rounded-sm border border-dashed border-[rgb(var(--line))] px-5 py-10 text-center font-sans text-sm text-[rgb(var(--muted))]">
            Nothing {filter === 'pending' ? 'waiting' : 'here'}.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((ask) => (
              <li key={ask.id} className="rounded-sm border border-[rgb(var(--line))] p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-serif text-lg text-[rgb(var(--ink))]">
                      {ask.subject || ask.name}
                    </span>
                    {ask.date ? (
                      <span className="ml-3 font-sans text-2xs text-gold-600 dark:text-gold-400">
                        {when(ask.date)}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em]',
                      ask.status === 'done'
                        ? 'border-gold-400 text-gold-700 dark:text-gold-300'
                        : ask.status === 'declined'
                          ? 'border-burgundy-400/60 text-burgundy-600 dark:text-burgundy-300'
                          : 'border-[rgb(var(--line))] text-[rgb(var(--muted))]',
                    )}
                  >
                    {ask.status}
                  </span>
                </div>

                <p className="mt-2 font-sans text-2xs text-[rgb(var(--muted))]">
                  {ask.type ? `${ask.type} · ` : ''}
                  asked by {ask.name} on {when(ask.at)}
                  {ask.phone ? ` · ${ask.phone}` : ''}
                  {ask.email ? ` · ${ask.email}` : ''}
                  {' · '}
                  {ask.id}
                </p>

                {ask.detail ? (
                  <p className="mt-3 whitespace-pre-line border-l-2 border-gold-400/40 pl-4 font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                    {ask.detail}
                  </p>
                ) : null}

                <ReplyBox
                  list={ask.kind}
                  target={{ ...ask, subject: ask.subject || 'your request' }}
                  onDone={load}
                />

                {ask.kind === 'prayers' ? (
                  <p className="mt-3 font-sans text-2xs text-[rgb(var(--muted))]">
                    {ask.mayPublish
                      ? 'They are content for this to appear in the notices.'
                      : 'Not to be published.'}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {ask.status !== 'done' ? (
                    <button
                      type="button"
                      disabled={busy === ask.id}
                      onClick={() => decide(ask, 'done')}
                      className="rounded-sm bg-gold-400 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 hover:bg-gold-300 disabled:opacity-60"
                    >
                      {ask.kind === 'certificates'
                        ? 'Ready to collect'
                        : ask.kind === 'intentions'
                          ? 'Written into the register'
                          : 'Prayed for'}
                    </button>
                  ) : null}

                  {ask.status !== 'declined' ? (
                    <button
                      type="button"
                      disabled={busy === ask.id}
                      onClick={() => decide(ask, 'declined')}
                      className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 disabled:opacity-60"
                    >
                      Set aside
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={busy === ask.id}
                    onClick={() => remove(ask)}
                    className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500 disabled:opacity-60"
                  >
                    Remove
                  </button>
                </div>

                {ask.note ? (
                  <p className="mt-3 font-sans text-2xs text-[rgb(var(--muted))]">
                    Note sent: {ask.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
