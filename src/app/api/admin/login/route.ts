import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { SESSION_COOKIE, createToken, sessionCookieOptions } from '@/lib/auth'
import { forgive, throttled } from '@/lib/limit'
import { touch, verifyLogin } from '@/lib/users'

export const runtime = 'nodejs'

/** Five attempts per address per fifteen minutes. Kept across restarts. */
const WINDOW = 15 * 60 * 1000
const LIMIT = 5

export async function POST(request: Request) {
  if (throttled(request, 'login', LIMIT, WINDOW)) {
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

  forgive(request, 'login')
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
