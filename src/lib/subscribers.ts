import crypto from 'node:crypto'
import path from 'node:path'

import { readRecords, writeJson } from './content'

/**
 * The newsletter list.
 *
 * Two things the old version lacked and needed before a single letter could go
 * out: one address appearing once however many times somebody presses the
 * button, and a way to leave that does not involve telephoning the parish
 * office. Every subscriber carries a token, and every letter carries the link
 * that uses it.
 */

const FILE = path.join(process.cwd(), 'content', 'subscribers.json')

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
  const list = await readSubscribers()

  const existing = list.find((entry) => entry.email?.trim().toLowerCase() === wanted)
  if (existing) {
    if (!existing.token) existing.token = newToken()
    const fresh = Boolean(existing.unsubscribedAt)
    delete existing.unsubscribedAt
    await writeJson(FILE, list)
    return { token: existing.token, fresh }
  }

  const token = newToken()
  list.unshift({ email: wanted, at: new Date().toISOString(), token })
  await writeJson(FILE, list.slice(0, 5000))
  return { token, fresh: true }
}

/** Marks one address as gone. Returns the address, so the page can say so. */
export async function unsubscribe(token: string): Promise<string | null> {
  const list = await readSubscribers()
  const found = list.find((entry) => entry.token === token)
  if (!found) return null
  found.unsubscribedAt = new Date().toISOString()
  await writeJson(FILE, list)
  return found.email
}

/** Everyone who should receive the next letter, each address once. */
export async function liveSubscribers(): Promise<Subscriber[]> {
  const list = await readSubscribers()
  const seen = new Set<string>()
  const live: Subscriber[] = []
  let changed = false

  for (const entry of list) {
    const email = entry.email?.trim().toLowerCase()
    if (!email || !email.includes('@')) continue
    if (entry.unsubscribedAt) continue
    if (seen.has(email)) continue
    seen.add(email)
    if (!entry.token) {
      entry.token = newToken()
      changed = true
    }
    live.push(entry)
  }

  // Backfill tokens on the old rows so the unsubscribe link always works.
  if (changed) await writeJson(FILE, list)
  return live
}
