'use client'

import { useCallback, useEffect, useState } from 'react'

import { Empty, Loading, Panel, Pill, when } from './Panel'

type Fault = {
  id: string
  at: string
  lastAt: string
  scope: 'server' | 'browser'
  message: string
  where: string
  detail?: string
  count: number
}

/**
 * What has gone wrong, so the first anyone hears of a broken page is not a
 * telephone call. The same fault repeating is counted, not listed again.
 */
export function Problems() {
  const [faults, setFaults] = useState<Fault[] | null>(null)
  const [open, setOpen] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/problems', { cache: 'no-store' })
      const json = await res.json()
      setFaults(Array.isArray(json.faults) ? json.faults : [])
    } catch {
      setFaults([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function clear() {
    if (!window.confirm('Clear the list? Faults already dealt with will not come back.')) return
    setBusy(true)
    try {
      await fetch('/api/admin/problems', { method: 'DELETE' })
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      title="Problems"
      blurb="Faults the site has hit, on the server and in visitors' browsers."
      actions={
        faults && faults.length > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={clear}
            className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500 disabled:opacity-50"
          >
            Clear the list
          </button>
        ) : null
      }
    >
      {faults === null ? (
        <Loading rows={3} />
      ) : faults.length === 0 ? (
        <Empty>Nothing has gone wrong. This is the page you want to be dull.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {faults.map((fault) => (
            <li key={fault.id} className="rounded-sm border border-[rgb(var(--line))] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="min-w-0 font-sans text-sm text-[rgb(var(--ink))]">
                  {fault.message}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {fault.count > 1 ? <Pill tone="warn">{fault.count} times</Pill> : null}
                  <Pill tone={fault.scope === 'server' ? 'bad' : 'quiet'}>{fault.scope}</Pill>
                </span>
              </div>

              <p className="mt-2 font-sans text-2xs text-[rgb(var(--muted))]">
                {fault.where || 'unknown page'} · first {when(fault.at)}
                {fault.count > 1 ? ` · last ${when(fault.lastAt)}` : ''}
              </p>

              {fault.detail ? (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen(open === fault.id ? '' : fault.id)}
                    className="mt-3 font-sans text-2xs uppercase tracking-[0.14em] text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
                  >
                    {open === fault.id ? 'Hide the detail' : 'Show the detail'}
                  </button>
                  {open === fault.id ? (
                    <pre className="mt-3 max-h-56 overflow-auto rounded-sm border border-[rgb(var(--line))] p-4 font-mono text-2xs leading-relaxed text-[rgb(var(--muted))]">
                      {fault.detail}
                    </pre>
                  ) : null}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
