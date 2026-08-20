import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { SESSION_COOKIE, createToken, sessionCookieOptions } from '@/lib/auth'
import { touch, verifyLogin } from '@/lib/users'

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

  const user = await verifyLogin(username, password)
  if (!user) {
    await audit({
      request,
      actor: username.trim().toLowerCase().slice(0, 40) || 'unknown',
      role: 'none',
      action: 'sign-in-refused',
    })
    // One message for both cases — never reveal which half was wrong.
    return NextResponse.json({ error: 'Incorrect user ID or password' }, { status: 401 })
  }

  attempts.delete(ip)
  await touch(user.username)
  await audit({
    request,
    actor: user.username,
    role: user.role,
    action: 'sign-in',
    detail: user.id === 'env' ? 'environment account' : user.name,
  })

  const response = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } })
  response.cookies.set(
    SESSION_COOKIE,
    createToken({ username: user.username, role: user.role }),
    sessionCookieOptions(),
  )
  return response
}
