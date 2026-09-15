import crypto from 'node:crypto'

import { readRecords, updateRecords } from './content'

/**
 * The newsletter list.
 *
 * Two things the old version lacked and needed before a single letter could go
 * out: one address appearing once however many times somebody presses the
 * button, and a way to leave that does not involve telephoning the parish
 * office. Every subscriber carries a token, and every letter carries the link
 * that uses it.
 */

export type Subscriber = {
  email: string
  at: string
  token: string
  /** When they left, if they have. The row is kept so they are not re-added. */
  unsubscribedAt?: string
}

export function newToken() {
  return crypto.randomBytes(18).toString('base64url')
}

export async function readSubscribers(): Promise<Subscriber[]> {
  return (await readRecords('subscribers')) as Subscriber[]
}

/**
 * Adds an address, or quietly does nothing if it is already there. Rows written
 * before tokens existed are given one the first time they are read.
 */
export async function subscribe(email: string): Promise<{ token: string; fresh: boolean }> {
  const wanted = email.trim().toLowerCase()
  let token = ''
  let fresh = true

  // The whole thing is one operation. Two people signing up in the same moment
  // used to read the same list and write it back one after the other, and the
  // first address vanished.
  await updateRecords<Subscriber>('subscribers', (list) => {
    const existing = list.find((entry) => entry.email?.trim().toLowerCase() === wanted)
    if (existing) {
      if (!existing.token) existing.token = newToken()
      token = existing.token
      fresh = Boolean(existing.unsubscribedAt)
      delete existing.unsubscribedAt
      return list
    }
    token = newToken()
    fresh = true
    list.unshift({ email: wanted, at: new Date().toISOString(), token })
    return list.slice(0, 5000)
  })

  return { token, fresh }
}

/** Marks one address as gone. Returns the address, so the page can say so. */
export async function unsubscribe(token: string): Promise<string | null> {
  let email: string | null = null
  await updateRecords<Subscriber>('subscribers', (list) => {
    const found = list.find((entry) => entry.token === token)
    if (!found) return list
    found.unsubscribedAt = new Date().toISOString()
    email = found.email
    return list
  })
  return email
}

/** Everyone who should receive the next letter, each address once. */
export async function liveSubscribers(): Promise<Subscriber[]> {
  let live: Subscriber[] = []

  // Reading and the token backfill happen together, so a sign-up landing in the
  // middle of it is not overwritten by the backfill.
  await updateRecords<Subscriber>('subscribers', (list) => {
    const seen = new Set<string>()
    const found: Subscriber[] = []

    for (const entry of list) {
      const email = entry.email?.trim().toLowerCase()
      if (!email || !email.includes('@')) continue
      if (entry.unsubscribedAt) continue
      if (seen.has(email)) continue
      seen.add(email)
      // Backfill a token on the old rows so the unsubscribe link always works.
      if (!entry.token) entry.token = newToken()
      found.push(entry)
    }

    live = found
    return list
  })

  return live
}
