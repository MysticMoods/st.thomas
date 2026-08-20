import crypto from 'crypto'
import { cookies } from 'next/headers'

import { type Role, readUsers } from './users'

export const SESSION_COOKIE = 'stc_admin'
const MAX_AGE = 60 * 60 * 8 // eight hours — one parish office day

/** The version stamped into a session. Raising it signs everybody out. */
const TOKEN_VERSION = 2

export type Session = { username: string; role: Role }

/**
 * Sessions are signed with a secret from the environment; `.env.local` is not
 * committed and `.env.example` documents every variable.
 */
function secret() {
  return process.env.ADMIN_SESSION_SECRET || 'dev-only-secret-change-me'
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** Constant-time comparison so a wrong signature leaks no timing information. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/** A session names the person, so every change can be attributed to them. */
export function createToken(session: Session) {
  const payload = Buffer.from(
    JSON.stringify({
      exp: Date.now() + MAX_AGE * 1000,
      u: session.username,
      r: session.role,
      v: TOKEN_VERSION,
    }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

/** The session a cookie carries, or null if it is missing, stale or forged. */
export function readToken(token: string | undefined): Session | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  if (!safeEqual(signature, sign(payload))) return null
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (claims?.v !== TOKEN_VERSION) return null
    if (typeof claims.exp !== 'number' || claims.exp <= Date.now()) return null
    if (typeof claims.u !== 'string' || !claims.u) return null
    return { username: claims.u, role: claims.r === 'owner' ? 'owner' : 'editor' }
  } catch {
    return null
  }
}

export function verifyToken(token: string | undefined): boolean {
  return readToken(token) !== null
}

/**
 * Who is signed in on this request, if anybody.
 *
 * The cookie says who it belongs to, but the accounts file has the last word:
 * suspending or removing somebody takes effect on their very next request
 * rather than eight hours later when their session would have expired. Their
 * role is read from the file too, so a demotion is immediate as well.
 */
export async function currentSession(): Promise<Session | null> {
  const store = await cookies()
  const claimed = readToken(store.get(SESSION_COOKIE)?.value)
  if (!claimed) return null

  const users = await readUsers()
  // No accounts yet means the site is still on the .env.local login.
  if (users.length === 0) return claimed

  const user = users.find((entry) => entry.username === claimed.username)
  if (!user) {
    // The bootstrap session that made the first account keeps the hours it has
    // left, so an owner can set the rest of the accounts up in one sitting. It
    // cannot be used to sign in again — verifyLogin only consults the store
    // once the store has anybody in it.
    const bootstrap = (process.env.ADMIN_USERNAME || 'vicar').trim().toLowerCase()
    return claimed.username === bootstrap ? { username: bootstrap, role: 'owner' } : null
  }
  if (user.disabled) return null
  return { username: user.username, role: user.role }
}

export async function isAuthenticated() {
  return (await currentSession()) !== null
}

/**
 * For the handful of things only an owner may do — making accounts, restoring a
 * backup over the live site. Returns the session, or null when it is refused.
 */
export async function requireOwner(): Promise<Session | null> {
  const session = await currentSession()
  return session?.role === 'owner' ? session : null
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  }
}
