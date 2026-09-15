'use client'

import { useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import { Empty, Loading, Panel, Pill, when } from './Panel'

type Entry = {
  id: string
  at: string
  actor: string
  role: string
  action: string
  target?: string
  detail?: string
  ip?: string
}

/** Plain words for what each action was, in the order they are most often read. */
const WORDS: Record<string, string> = {
  'sign-in': 'signed in',
  'sign-in-refused': 'was refused',
  'sign-out': 'signed out',
  'content-save': 'saved',
  'content-restore': 'restored',
  upload: 'uploaded',
  'hall-decide': 'decided a booking',
  'hall-book': 'wrote in a booking',
  'hall-free': 'freed a slot',
  'review-decide': 'decided a review',
  'review-delete': 'deleted a review',
  'user-create': 'added an account',
  'user-update': 'changed an account',
  'user-delete': 'removed an account',
  'problems-clear': 'cleared the problem list',
}

/** Addresses that say nothing — the office machine talking to itself. */
const LOCAL = new Set(['local', '::1', '127.0.0.1', '::ffff:127.0.0.1'])

/** Actions worth colouring, because they are the ones you look for. */
function tone(action: string) {
  if (action === 'sign-in-refused') return 'bad' as const
  if (action.startsWith('user-') || action === 'content-restore') return 'warn' as const
  return 'quiet' as const
}

/**
 * Every change the dashboard has made, newest first. Nothing here can be edited
 * or deleted from the site — that is the point of keeping it.
 */
export function Activity() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [actors, setActors] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [actor, setActor] = useState('')
  const [action, setAction] = useState('')
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (actor) params.set('actor', actor)
    if (action) params.set('action', action)
    try {
      const res = await fetch(`/api/admin/audit?${params}`, { cache: 'no-store' })
      const json = await res.json()
      setEntries(Array.isArray(json.entries) ? json.entries : [])
      setActors(json.actors ?? [])
      setActions(json.actions ?? [])
      setTotal(json.total ?? 0)
    } catch {
      setEntries([])
    }
  }, [actor, action])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Panel
      title="Activity log"
      blurb={`Who changed what, and when. ${total} entries kept.`}
      actions={
        <>
          <select
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            className="field !w-auto !py-2 !text-sm"
            aria-label="Filter by person"
          >
            <option value="">Everyone</option>
            {actors.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="field !w-auto !py-2 !text-sm"
            aria-label="Filter by action"
          >
            <option value="">Everything</option>
            {actions.map((name) => (
              <option key={name} value={name}>
                {WORDS[name] ?? name}
              </option>
            ))}
          </select>
        </>
      }
    >
      {entries === null ? (
        <Loading rows={6} />
      ) : entries.length === 0 ? (
        <Empty>Nothing recorded yet.</Empty>
      ) : (
        <ul className="divide-y divide-[rgb(var(--line))]">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
              <span className="w-44 shrink-0 font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                {when(entry.at)}
              </span>
              <span
                className={cn(
                  'font-sans text-sm font-medium',
                  entry.action === 'sign-in-refused'
                    ? 'text-burgundy-600 dark:text-burgundy-300'
                    : 'text-[rgb(var(--ink))]',
                )}
              >
                {entry.actor}
              </span>
              <span className="font-sans text-sm text-[rgb(var(--muted))]">
                {WORDS[entry.action] ?? entry.action}
                {entry.target ? ` ${entry.target}` : ''}
              </span>
              {entry.detail ? (
                <span className="font-sans text-2xs text-[rgb(var(--muted))]">
                  — {entry.detail}
                </span>
              ) : null}
              <span className="ml-auto flex items-center gap-2">
                {entry.ip && !LOCAL.has(entry.ip) ? (
                  <span className="font-sans text-2xs tabular-nums text-[rgb(var(--muted))]/70">
                    {entry.ip}
                  </span>
                ) : null}
                <Pill tone={tone(entry.action)}>{entry.role}</Pill>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
