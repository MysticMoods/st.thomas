/**
 * One throttle, used by every public form.
 *
 * The hall, review and donation endpoints each grew their own copy of this. The
 * contact form and the newsletter never got one at all, which meant anybody
 * could fill `content/messages.json` at whatever speed their connection allowed.
 *
 * In memory on purpose: a parish site runs as one process, and a limiter that
 * needed a database would be a worse thing to depend on than the one it guards.
 */

type Bucket = { count: number; until: number }

const buckets = new Map<string, Bucket>()

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
    return false
  }

  bucket.count += 1
  return bucket.count > limit
}

/** Clears one caller's count — used after a successful sign-in. */
export function forgive(request: Request, name: string) {
  buckets.delete(`${name}:${callerIp(request)}`)
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
