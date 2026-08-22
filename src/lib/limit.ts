import { promises as fs, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * One throttle, used by every gate on the site.
 *
 * Every endpoint that needed limiting had grown its own copy of the same
 * fifteen lines, and the contact form and newsletter had none at all. They all
 * come here now, so raising a limit or reading what is held means one place.
 *
 * Counts are kept in memory and written to disk behind them. In memory because
 * a parish site runs as one process and a limiter that needed a database would
 * be a worse thing to depend on than the one it guards; on disk because a
 * limiter that forgets everything when the site restarts is one that anybody
 * patient enough to wait for a deploy can walk straight past — and the sign-in
 * gate is one of them.
 */

type Bucket = { count: number; until: number }

const buckets = new Map<string, Bucket>()

const FILE = path.join(process.cwd(), 'content', 'limits.json')
const SAVE_AFTER = 2000

let saving: ReturnType<typeof setTimeout> | null = null

/** What was still running when the site last stopped. Expired counts are dropped. */
function restore() {
  try {
    const rows = JSON.parse(readFileSync(FILE, 'utf-8')) as [string, Bucket][]
    const now = Date.now()
    for (const [key, bucket] of rows) {
      if (bucket && bucket.until > now) buckets.set(key, bucket)
    }
  } catch {
    /* no file, or nothing readable in it: start with a clean slate */
  }
}

restore()

/**
 * Written a moment after the last change rather than on every request, and
 * never waited for. A throttle that cannot write to disk is still a throttle,
 * so nothing here is allowed to fail a request.
 */
function keep() {
  if (saving) return
  saving = setTimeout(() => {
    saving = null
    const now = Date.now()
    const rows = [...buckets].filter(([, bucket]) => bucket.until > now)
    fs.writeFile(FILE, JSON.stringify(rows)).catch(() => {})
  }, SAVE_AFTER)
  // Never hold the process open for the sake of a counter.
  saving.unref?.()
}

/** The address a request came from, as far as the proxy in front of us says. */
export function callerIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  )
}

/**
 * True when this caller has had their share of `name` for the moment. Each
 * gate keeps its own count, so filling in the contact form never uses up
 * somebody's hall bookings.
 */
export function throttled(
  request: Request,
  name: string,
  limit: number,
  windowMs = 60 * 60 * 1000,
) {
  const key = `${name}:${callerIp(request)}`
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.until < now) {
    buckets.set(key, { count: 1, until: now + windowMs })
    // Cheap sweep so a long-running server does not hold every address it
    // has ever seen.
    if (buckets.size > 5000) {
      for (const [entry, held] of buckets) if (held.until < now) buckets.delete(entry)
    }
    keep()
    return false
  }

  bucket.count += 1
  keep()
  return bucket.count > limit
}

/** Clears one caller's count — used after a successful sign-in. */
export function forgive(request: Request, name: string) {
  buckets.delete(`${name}:${callerIp(request)}`)
  keep()
}

/** What is being held back at the moment, for the dashboard's health panel. */
export function heldBack() {
  const now = Date.now()
  return [...buckets].filter(([, bucket]) => bucket.until > now).length
}

/**
 * The field a person never sees and a form-filling robot always fills.
 *
 * Cheaper and kinder than a captcha: no puzzle, nothing to read out, nothing
 * sent to a third party, and it costs a visitor using a screen reader nothing
 * because the field is hidden from them too.
 */
export const HONEYPOT = 'website'

export function looksAutomated(body: Record<string, unknown>) {
  const bait = body?.[HONEYPOT]
  return typeof bait === 'string' && bait.trim().length > 0
}
