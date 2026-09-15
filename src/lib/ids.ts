import crypto from 'node:crypto'

/**
 * Identifiers for the records the site writes.
 *
 * These started as the time alone — `hb` plus a millisecond in base 36 — which
 * is two problems in one string. Two people sending a form in the same
 * millisecond get the same id, and every list here is searched with `find`, so
 * the second booking becomes unreachable behind the first. Worse, a clock is
 * not a secret: anybody who knows roughly when a neighbour booked the hall can
 * walk the handful of ids around that moment.
 *
 * The time stays because a sorted list of ids is a useful thing to have, and
 * four random bytes follow it, which is what makes an id worth handing out.
 */
export function recordId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`
}
