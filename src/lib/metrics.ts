import { promises as fs } from 'node:fs'
import path from 'node:path'

import { store } from './store'

/**
 * How much the site is being read.
 *
 * Deliberately the smallest thing that answers the question. No third party, no
 * cookie, no address stored, nothing that could identify one reader: a page
 * view is a number in a day's column, and a "visit" is one browser session that
 * said so itself. That keeps the promise the privacy page makes, and it means
 * the parish owns its own figures.
 */

const KEEP_DAYS = 180

/**
 * How many different paths and referrers one day may name.
 *
 * The counter is public, as it has to be, and it takes whatever path the
 * browser says it read. Nothing stopped somebody posting a thousand invented
 * ones and leaving the parish with a file that grows for ever. Past this many,
 * a path that has not been seen today is counted under `/other` — real pages
 * are a short list, so the figures the office reads are unchanged.
 */
const MAX_KEYS_PER_DAY = 300

export type Day = {
  views: number
  visits: number
  paths: Record<string, number>
  referrers: Record<string, number>
}

export type Analytics = { days: Record<string, Day> }

const EMPTY: Analytics = { days: {} }

export async function readAnalytics(): Promise<Analytics> {
  try {
    const parsed = await store.readState<Analytics>('analytics', { days: {} })
    return parsed && typeof parsed === 'object' && parsed.days ? (parsed as Analytics) : EMPTY
  } catch {
    return EMPTY
  }
}

/** Today in the parish's own calendar, not UTC — the figures are read locally. */
function today() {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** A path worth counting, or nothing. Query strings are never recorded. */
export function tidyPath(value: string) {
  const cut = String(value || '').split('?')[0].split('#')[0]
  if (!cut.startsWith('/')) return ''
  if (cut.startsWith('/admin')) return ''
  if (!/^\/[a-z0-9/_-]*$/i.test(cut)) return '/other'
  return cut.length > 60 ? '/other' : cut || '/'
}

/** Only the host a reader arrived from, never the full URL they came from. */
export function tidyReferrer(value: string, self: string) {
  if (!value) return ''
  try {
    const host = new URL(value).hostname.replace(/^www\./, '')
    if (!host || host === self.replace(/^www\./, '')) return ''
    return host.slice(0, 80)
  } catch {
    return ''
  }
}

// Views arrive one at a time and the file is small, so they are gathered in
// memory and written at most once every few seconds rather than on each beat.
let pending: { path: string; referrer: string; first: boolean }[] = []
let timer: NodeJS.Timeout | null = null
let writing: Promise<void> = Promise.resolve()

export function countView(entry: { path: string; referrer: string; first: boolean }) {
  pending.push(entry)
  if (!timer) timer = setTimeout(() => void flush(), 4000)
}

/** Writes whatever has gathered. Safe to call at any time, including twice. */
export async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  const batch = pending
  pending = []
  if (batch.length === 0) return writing

  writing = writing.then(async () => {
    try {
      const data = await readAnalytics()
      const key = today()
      const day: Day = data.days[key] ?? { views: 0, visits: 0, paths: {}, referrers: {} }

      const fold = (into: Record<string, number>, name: string) => {
        const key =
          name in into || Object.keys(into).length < MAX_KEYS_PER_DAY ? name : '/other'
        into[key] = (into[key] ?? 0) + 1
      }

      for (const entry of batch) {
        day.views += 1
        if (entry.first) day.visits += 1
        if (entry.path) fold(day.paths, entry.path)
        if (entry.referrer) fold(day.referrers, entry.referrer)
      }

      data.days[key] = day

      // Keep half a year. Older columns are of no use to a parish office.
      const keys = Object.keys(data.days).sort()
      for (const old of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) {
        delete data.days[old]
      }

      await store.writeState('analytics', data)
    } catch {
      /* counting readers must never break serving them */
    }
  })

  return writing
}

/** The last `days` columns, oldest first, with the empty days filled in. */
export function recentDays(data: Analytics, days: number) {
  const out: { date: string; views: number; visits: number }[] = []
  const cursor = new Date()
  for (let i = days - 1; i >= 0; i -= 1) {
    const at = new Date(cursor)
    at.setDate(cursor.getDate() - i)
    const month = `${at.getMonth() + 1}`.padStart(2, '0')
    const day = `${at.getDate()}`.padStart(2, '0')
    const key = `${at.getFullYear()}-${month}-${day}`
    const found = data.days[key]
    out.push({ date: key, views: found?.views ?? 0, visits: found?.visits ?? 0 })
  }
  return out
}

/** Totals across every day held, biggest first. */
export function totals(data: Analytics) {
  const paths: Record<string, number> = {}
  const referrers: Record<string, number> = {}
  let views = 0
  let visits = 0

  for (const day of Object.values(data.days)) {
    views += day.views
    visits += day.visits
    for (const [key, n] of Object.entries(day.paths)) paths[key] = (paths[key] ?? 0) + n
    for (const [key, n] of Object.entries(day.referrers)) referrers[key] = (referrers[key] ?? 0) + n
  }

  const rank = (record: Record<string, number>) =>
    Object.entries(record)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }))

  return { views, visits, paths: rank(paths), referrers: rank(referrers) }
}
