'use client'

import { useCallback, useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'

import { Loading, Panel, Pill, sizeOf, when } from './Panel'

type Health = {
  ok: boolean
  warnings: string[]
  writable: boolean
  missing: string[]
  uptimeSeconds: number
  node: string
  platform: string
  environment: string
  accounts: number
  mail: boolean
  openFaults: number
  storage: Record<string, { files: number; bytes: number }>
  counts: Record<string, number>
  at: string
}

function forHowLong(seconds: number) {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`
}

/**
 * Whether the machine underneath is well.
 *
 * The check that matters most is whether the content folder can still be
 * written to: the pages carry on serving from a read-only or full disk while
 * every edit silently fails to save.
 */
export function System() {
  const [health, setHealth] = useState<Health | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/health', { cache: 'no-store' })
      setHealth(await res.json())
    } catch {
      setHealth(null)
    }
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 60_000)
    return () => clearInterval(timer)
  }, [load])

  if (!health) {
    return (
      <Panel title="System health" blurb="Whether the site can still do its work.">
        <Loading rows={3} />
      </Panel>
    )
  }

  return (
    <Panel
      title="System health"
      blurb={`Checked ${when(health.at)}. Refreshes every minute.`}
      actions={
        <button
          type="button"
          onClick={load}
          className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
        >
          Check now
        </button>
      }
    >
      <div
        className={
          health.ok
            ? 'flex items-center gap-3 rounded-sm border border-gold-400/50 bg-gold-400/10 px-5 py-4'
            : 'flex items-center gap-3 rounded-sm border border-burgundy-400/50 bg-burgundy-500/10 px-5 py-4'
        }
      >
        <Icon
          name={health.ok ? 'check' : 'bell'}
          className={health.ok ? 'h-5 w-5 text-gold-500' : 'h-5 w-5 text-burgundy-500'}
        />
        <span className="font-sans text-sm text-[rgb(var(--ink))]">
          {health.ok
            ? 'Everything checked is in order.'
            : health.warnings.length === 1
              ? 'One thing needs attention.'
              : `${health.warnings.length} things need attention.`}
        </span>
      </div>

      {health.warnings.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-2">
          {health.warnings.map((warning) => (
            <li
              key={warning}
              className="flex gap-3 rounded-sm border border-[rgb(var(--line))] px-4 py-3"
            >
              <Icon name="bell" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-burgundy-500" />
              <span className="font-sans text-sm text-[rgb(var(--muted))]">{warning}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <dl className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Content folder', value: health.writable ? 'writable' : 'READ ONLY' },
          { label: 'Running for', value: forHowLong(health.uptimeSeconds) },
          { label: 'Mode', value: health.environment },
          { label: 'Node', value: health.node },
          { label: 'Machine', value: health.platform },
          { label: 'Staff accounts', value: `${health.accounts || 'shared login'}` },
          { label: 'Letters out', value: health.mail ? 'mail server set' : 'not set up' },
        ].map((row) => (
          <div key={row.label} className="border-t border-[rgb(var(--line))] pt-3">
            <dt className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
              {row.label}
            </dt>
            <dd className="mt-1 font-sans text-sm text-[rgb(var(--ink))]">{row.value}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
        What is stored
      </h2>
      <ul className="mt-4 divide-y divide-[rgb(var(--line))]">
        {Object.entries(health.storage).map(([name, entry]) => (
          <li key={name} className="flex items-baseline justify-between gap-4 py-2.5">
            <span className="font-sans text-sm text-[rgb(var(--ink))]">{name}</span>
            <span className="font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
              {entry.files} files · {sizeOf(entry.bytes)}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
        Records held
      </h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {Object.entries(health.counts).map(([name, count]) => (
          <li key={name}>
            <Pill tone={count > 0 ? 'good' : 'quiet'}>
              {name}: {count}
            </Pill>
          </li>
        ))}
        <li>
          <Pill tone={health.openFaults > 0 ? 'bad' : 'quiet'}>
            problems: {health.openFaults}
          </Pill>
        </li>
      </ul>

      <p className="mt-8 rounded-sm border border-[rgb(var(--line))] px-4 py-3 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
        An uptime monitor should watch <code>/api/health</code>. It answers 200 while the site can
        read its content and write to disk, and 503 the moment it cannot — which is the failure
        that would otherwise go unnoticed, because the pages keep serving either way.
      </p>
    </Panel>
  )
}
