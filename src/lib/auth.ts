import crypto from 'crypto'
import { cookies } from 'next/headers'

export const SESSION_COOKIE = 'stc_admin'
const MAX_AGE = 60 * 60 * 8 // eight hours — one parish office day

/**
 * The one host account. Credentials come from the environment; `.env.local` is
 * not committed and `.env.example` documents every variable.
 */
function secret() {
  return process.env.ADMIN_SESSION_SECRET || 'dev-only-secret-change-me'
}

function expectedUsername() {
  return process.env.ADMIN_USERNAME || 'vicar'
}

function expectedPassword() {
  return process.env.ADMIN_PASSWORD || 'mangalassery1893'
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** Constant-time comparison so a wrong password leaks no timing information. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Both halves are always compared, even when the user id is already wrong, so
 * the response time never reveals which of the two was incorrect.
 */
export function verifyCredentials(username: string, password: string) {
  const userOk = safeEqual((username || '').trim().toLowerCase(), expectedUsername().toLowerCase())
  const passOk = safeEqual(password || '', expectedPassword())
  return userOk && passOk
}

export function createToken() {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + MAX_AGE * 1000, v: 1 }),
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  if (!safeEqual(signature, sign(payload))) return false
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

export async function isAuthenticated() {
  const store = await cookies()
  return verifyToken(store.get(SESSION_COOKIE)?.value)
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
