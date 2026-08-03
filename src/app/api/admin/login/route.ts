import { NextResponse } from 'next/server'

import { SESSION_COOKIE, createToken, sessionCookieOptions, verifyCredentials } from '@/lib/auth'

export const runtime = 'nodejs'

/** Simple in-memory throttle: five attempts per IP per fifteen minutes. */
const attempts = new Map<string, { count: number; until: number }>()
const WINDOW = 15 * 60 * 1000
const LIMIT = 5

function throttled(ip: string) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.until < now) {
    attempts.set(ip, { count: 1, until: now + WINDOW })
    return false
  }
  entry.count += 1
  return entry.count > LIMIT
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'

  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait fifteen minutes.' },
      { status: 429 },
    )
  }

  let username = ''
  let password = ''
  try {
    const body = await request.json()
    username = String(body?.username ?? '')
    password = String(body?.password ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!verifyCredentials(username, password)) {
    // One message for both cases — never reveal which half was wrong.
    return NextResponse.json({ error: 'Incorrect user ID or password' }, { status: 401 })
  }

  attempts.delete(ip)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, createToken(), sessionCookieOptions())
  return response
}
