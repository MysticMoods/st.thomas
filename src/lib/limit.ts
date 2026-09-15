import { store } from './store'

/**
 * One throttle, used by every gate on the site.
 *
 * Every endpoint that needed limiting had grown its own copy of the same
 * fifteen lines, and the contact form and newsletter had none at all. They all
 * come here now, so raising a limit or reading what is held means one place.
 *
 * Counts are kept in memory and written behind them, because a limiter that
 * forgets everything when the site restarts is one that anybody patient enough
 * to wait for a deploy can walk straight past — and the sign-in gate is one of
 * them. On a host that starts a fresh copy of the site whenever it feels like
 * it, that is not a nicety: without this, five wrong passwords and a cold start
 * gives an attacker five more.
 *
 * Copies of the site that run side by side keep their own counts and merge them
 * when they save, taking whichever count is higher. That is not perfect — two
 * copies can each let a few attempts through before they see one another — but
 * the alternative is a database write on every request to every form, and this
 * is a parish website. Merging on the high count means the error is always in
 * the direction of stopping somebody, never of letting them run.
 */

type Bucket = { count: number; until: number }

const buckets = new Map<string, Bucket>()

/**
 * Counts that have been forgiven since the last save.
 *
 * Clearing one only in memory was not enough: the save reads what is on disk,
 * merges it with what is held, and takes whichever count is higher — so the
 * count just cleared came straight back, and the next restart handed it to the
 * person who had already signed in successfully.
 */
const forgiven = new Set<string>()

const SAVE_AFTER = 2000

let saving: ReturnType<typeof setTimeout> | null = null

/**
 * What was still running when this copy of the site started. Read once, in the
 * background: until it arrives the counts are simply empty, which is the same
 * position the site was in before any of this was written down at all.
 */
void store
  .readState<[string, Bucket][]>('limits', [])
  .then((rows) => {
    const now = Date.now()
    for (const [key, bucket] of Array.isArray(rows) ? rows : []) {
      if (!bucket || bucket.until <= now) continue
      const held = buckets.get(key)
      if (!held || bucket.count > held.count) buckets.set(key, bucket)
    }
  })
  .catch(() => {
    /* nothing kept, or nothing readable: start with a clean slate */
  })

/**
 * Written a moment after the last change rather than on every request, and
 * never waited for. A throttle that cannot write is still a throttle, so
 * nothing here is allowed to fail a request.
 */
function keep() {
  if (saving) return
  saving = setTimeout(async () => {
    saving = null
    try {
      const now = Date.now()
      const stored = await store.readState<[string, Bucket][]>('limits', [])
      const merged = new Map<string, Bucket>()

      for (const [key, bucket] of Array.isArray(stored) ? stored : []) {
        if (forgiven.has(key)) continue
        if (bucket && bucket.until > now) merged.set(key, bucket)
      }
      for (const [key, bucket] of buckets) {
        if (bucket.until <= now) continue
        const held = merged.get(key)
        // The higher count wins, so a second copy of the site cannot hand
        // somebody a fresh set of attempts by saving after it.
        if (!held || bucket.count > held.count) merged.set(key, bucket)
      }

      await store.writeState('limits', [...merged])
      forgiven.clear()
    } catch {
      /* a counter that cannot be written down is still worth having in memory */
    }
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
    forgiven.delete(key)
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
  const key = `${name}:${callerIp(request)}`
  buckets.delete(key)
  // Remembered until the next save, so the merge does not read the count back
  // off the disk and undo this.
  forgiven.add(key)
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
