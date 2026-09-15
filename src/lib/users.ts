import crypto from 'node:crypto'

import { recordId } from './ids'
import { type Role, asRole } from './permissions'

export type { Role }
import type { ContentKey } from './types'
import { store } from './store'

/**
 * Staff accounts for the dashboard.
 *
 * The site used to have exactly one shared login read from the environment.
 * That is fine until two people use it: nothing then records who changed the
 * notice board or who confirmed a wedding booking. Accounts live here instead,
 * one per person, with the password kept only as a scrypt hash.
 *
 * The environment account is still honoured as a bootstrap. If no accounts file
 * exists — a fresh clone, or a parish that has not made accounts yet — the
 * ADMIN_USERNAME / ADMIN_PASSWORD pair signs in as the owner, so nobody is ever
 * locked out of their own site.
 */

export type User = {
  id: string
  /** Always stored lower case; the login box is case-insensitive. */
  username: string
  name: string
  role: Role
  /**
   * Which sections this person may edit, when their role lets them edit pages
   * at all. Absent or empty means all of them — which is what every account
   * made before jurisdictions existed has, so nobody lost work overnight.
   */
  sections?: ContentKey[]
  salt: string
  hash: string
  createdAt: string
  lastSeen?: string
  disabled?: boolean
}

/** What may safely be sent to the browser — never the hash. */
export type PublicUser = Omit<User, 'salt' | 'hash'>

const SCRYPT = { N: 16384, r: 8, p: 1 } as const
const KEY_LENGTH = 64

export const MIN_PASSWORD = 10

/**
 * The demo password is printed in `.env.example` and in every copy of this
 * repository, which makes it a convenience in development and a hole in
 * production. A live site that never set ADMIN_PASSWORD has no bootstrap login
 * at all, rather than one the whole world can read.
 */
function bootstrapPassword() {
  const set = process.env.ADMIN_PASSWORD
  if (set) return set
  return process.env.NODE_ENV === 'production' ? '' : 'mangalassery1893'
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT).toString('hex')
  return { salt, hash }
}

/** Constant time, and never throws on a malformed stored hash. */
function passwordMatches(password: string, salt: string, hash: string) {
  try {
    const attempt = crypto.scryptSync(password, salt, KEY_LENGTH, SCRYPT)
    const stored = Buffer.from(hash, 'hex')
    if (stored.length !== attempt.length) return false
    return crypto.timingSafeEqual(attempt, stored)
  } catch {
    return false
  }
}

export async function readUsers(): Promise<User[]> {
  const list = await store.readState<User[]>('users', [])
  if (!Array.isArray(list)) return []
  // A role nobody recognises — a typo, a hand-edited file, an account written
  // by a newer version of the site — becomes an editor rather than whatever it
  // happened to say. It must never fail open into an owner.
  return list.map((user) => ({ ...user, role: asRole(user.role) }))
}

export async function writeUsers(users: User[]) {
  await store.writeState('users', users)
}

export function publicUser(user: User): PublicUser {
  const { salt: _salt, hash: _hash, ...rest } = user
  return rest
}

/**
 * Constant-time comparison of two strings of any length. Digesting first keeps
 * both sides the same size, which timingSafeEqual insists on.
 */
function sameSecret(a: string, b: string) {
  const digest = (value: string) => crypto.createHash('sha256').update(value).digest()
  return crypto.timingSafeEqual(digest(a), digest(b))
}

/** The account described by the environment, used only while none can sign in. */
function envOwner(): User {
  const username = (process.env.ADMIN_USERNAME || 'vicar').trim().toLowerCase()
  return {
    id: 'env',
    username,
    name: 'Parish office',
    role: 'owner' as Role,
    salt: '',
    hash: '',
    createdAt: new Date(0).toISOString(),
  }
}

/**
 * Checks one login. Returns the account on success and null on failure, and
 * takes the same path either way so the response time gives nothing away.
 */
export async function verifyLogin(username: string, password: string): Promise<User | null> {
  const wanted = (username || '').trim().toLowerCase()
  const users = await readUsers()

  // The bootstrap is also the way back in when every account has been suspended
  // — a file edited by hand, an owner disabled by another owner in the wrong
  // order. Without this the parish would be locked out of its own dashboard
  // with no way in short of a terminal on the server.
  if (users.every((user) => user.disabled)) {
    const owner = envOwner()
    const expected = bootstrapPassword()
    if (!expected) return null
    const userOk = sameSecret(wanted, owner.username)
    const passOk = sameSecret(password || '', expected)
    return userOk && passOk ? owner : null
  }

  const found = users.find((user) => user.username === wanted && !user.disabled)
  // Hash against a throwaway salt even when there is no such user, so that a
  // wrong user id costs the same as a wrong password.
  const salt = found?.salt || 'absent'
  const hash = found?.hash || crypto.scryptSync('absent', 'absent', KEY_LENGTH, SCRYPT).toString('hex')
  const ok = passwordMatches(password || '', salt, hash)
  return ok && found ? found : null
}

export async function findByUsername(username: string) {
  const wanted = (username || '').trim().toLowerCase()
  return (await readUsers()).find((user) => user.username === wanted)
}

export async function findById(id: string) {
  return (await readUsers()).find((user) => user.id === id)
}

/** Records that this account was seen, at most once an hour, never fatally. */
export async function touch(username: string) {
  try {
    const users = await readUsers()
    const user = users.find((entry) => entry.username === username)
    if (!user) return
    const last = user.lastSeen ? Date.parse(user.lastSeen) : 0
    if (Date.now() - last < 60 * 60 * 1000) return
    user.lastSeen = new Date().toISOString()
    await writeUsers(users)
  } catch {
    /* a busy file must never cost somebody their session */
  }
}

export function newId() {
  return recordId('u')
}

/** A parish must never be able to lock itself out of its own dashboard. */
export function ownersLeft(users: User[], excludingId?: string) {
  return users.filter((user) => user.role === 'owner' && !user.disabled && user.id !== excludingId)
    .length
}

/** Reasons a password is refused, in the words shown to the person typing it. */
export function passwordProblem(password: string) {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (/^\d+$/.test(password)) return 'Use more than digits alone.'
  if (/^(password|parish|church|admin)/i.test(password)) return 'Too easy to guess.'
  return ''
}
