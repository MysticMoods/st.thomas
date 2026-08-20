'use client'

import { useCallback, useEffect, useState } from 'react'

import { Empty, Loading, Panel } from './Panel'

type Payload = {
  days: { date: string; views: number; visits: number }[]
  views: number
  visits: number
  paths: { name: string; count: number }[]
  referrers: { name: string; count: number }[]
  keptDays: number
}

/**
 * How much the site is read.
 *
 * Counted by the site itself — no third party, no cookie, no address kept — so
 * the figures are modest but they are the parish's own and they cost a reader
 * nothing.
 */
export function Visits() {
  const [span, setSpan] = useState(30)
  const [data, setData] = useState<Payload | null>(null)

  const load = useCallback(async () => {
    setData(null)
    try {
      const res = await fetch(`/api/admin/metrics?days=${span}`, { cache: 'no-store' })
      setData(await res.json())
    } catch {
      setData(null)
    }
  }, [span])

  useEffect(() => {
    load()
  }, [load])

  const peak = data ? Math.max(1, ...data.days.map((day) => day.views)) : 1
  const inSpan = data
    ? data.days.reduce(
        (sum, day) => ({ views: sum.views + day.views, visits: sum.visits + day.visits }),
        { views: 0, visits: 0 },
      )
    : { views: 0, visits: 0 }

  return (
    <Panel
      title="Visits"
      blurb="Counted by this site alone. No cookie is set and no address is kept."
      actions={
        <>
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setSpan(days)}
              aria-pressed={span === days}
              className={
                span === days
                  ? 'rounded-sm border border-gold-400 bg-gold-400/10 px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-gold-700 dark:text-gold-300'
                  : 'rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400'
              }
            >
              {days} days
            </button>
          ))}
        </>
      }
    >
      {data === null ? (
        <Loading rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: `Views, last ${span} days`, value: inSpan.views },
              { label: `Visits, last ${span} days`, value: inSpan.visits },
              { label: 'Views, all kept', value: data.views },
              { label: 'Days on record', value: data.keptDays },
            ].map((figure) => (
              <div key={figure.label}>
                <p className="font-display text-3xl tabular-nums text-[rgb(var(--ink))]">
                  {figure.value.toLocaleString('en-IN')}
                </p>
                <p className="mt-1 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
                  {figure.label}
                </p>
              </div>
            ))}
          </div>

          {/* one bar a day, tallest day sets the height */}
          <div className="mt-10 flex h-40 items-end gap-[2px]">
            {data.days.map((day) => (
              <span
                key={day.date}
                title={`${day.date} — ${day.views} views, ${day.visits} visits`}
                style={{ height: `${Math.max(2, (day.views / peak) * 100)}%` }}
                className="flex-1 rounded-t-[2px] bg-gold-400/70 transition-colors hover:bg-gold-400"
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between font-sans text-2xs text-[rgb(var(--muted))]">
            <span>{data.days[0]?.date}</span>
            <span>{data.days[data.days.length - 1]?.date}</span>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
                Most read pages
              </h2>
              {data.paths.length === 0 ? (
                <Empty>Nothing counted yet.</Empty>
              ) : (
                <ul className="mt-4 divide-y divide-[rgb(var(--line))]">
                  {data.paths.map((row) => (
                    <li key={row.name} className="flex items-baseline justify-between gap-4 py-2.5">
                      <span className="truncate font-sans text-sm text-[rgb(var(--ink))]">
                        {row.name}
                      </span>
                      <span className="shrink-0 font-sans text-sm tabular-nums text-[rgb(var(--muted))]">
                        {row.count.toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
                Where readers came from
              </h2>
              {data.referrers.length === 0 ? (
                <Empty>Everyone so far arrived directly.</Empty>
              ) : (
                <ul className="mt-4 divide-y divide-[rgb(var(--line))]">
                  {data.referrers.map((row) => (
                    <li key={row.name} className="flex items-baseline justify-between gap-4 py-2.5">
                      <span className="truncate font-sans text-sm text-[rgb(var(--ink))]">
                        {row.name}
                      </span>
                      <span className="shrink-0 font-sans text-sm tabular-nums text-[rgb(var(--muted))]">
                        {row.count.toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </Panel>
  )
}
