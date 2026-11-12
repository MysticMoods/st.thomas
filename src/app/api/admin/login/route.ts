import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { SESSION_COOKIE, createToken, sessionCookieOptions } from '@/lib/auth'
import { getFirebaseAdminEmail, verifyFirebaseIdToken } from '@/lib/firebase/admin'
import { forgive, throttled } from '@/lib/limit'
import type { Role } from '@/lib/permissions'
import { readUsers, touch, verifyLogin } from '@/lib/users'

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

  let idToken = ''
  let username = ''
  let password = ''
  try {
    const body = await request.json()
    idToken = String(body?.idToken ?? '')
    username = String(body?.username ?? '')
    password = String(body?.password ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // --- 1. Firebase Authentication Path ---
  if (idToken) {
    const verified = await verifyFirebaseIdToken(idToken)
    if (!verified || !verified.email) {
      await audit({
        request,
        actor: 'unknown',
        role: 'none',
        action: 'sign-in-refused',
        detail: 'invalid-firebase-token',
      })
      return NextResponse.json({ error: 'Invalid or expired Firebase authentication token' }, { status: 401 })
    }

    const email = verified.email.toLowerCase()
    const users = await readUsers()
    const found = users.find(
      (u) =>
        u.username.toLowerCase() === email ||
        u.username.toLowerCase() === email.split('@')[0],
    )

    if (found?.disabled) {
      await audit({
        request,
        actor: email,
        role: 'none',
        action: 'sign-in-refused',
        detail: 'account-disabled',
      })
      return NextResponse.json({ error: 'This staff account has been deactivated.' }, { status: 403 })
    }

    const bootstrapEmail = getFirebaseAdminEmail()
    const isBootstrap =
      (bootstrapEmail && email === bootstrapEmail) ||
      users.length === 0 ||
      users.every((u) => u.disabled)

    if (!found && !isBootstrap) {
      await audit({
        request,
        actor: email,
        role: 'none',
        action: 'sign-in-refused',
        detail: 'unauthorized-email',
      })
      return NextResponse.json(
        { error: 'No staff account found for this email. Contact the parish administrator.' },
        { status: 403 },
      )
    }

    const role: Role = found ? found.role : 'owner'
    const name = found?.name || verified.name || email.split('@')[0]

    forgive(request, 'login')
    await touch(email)
    await audit({
      request,
      actor: email,
      role,
      action: 'sign-in',
      detail: found ? `Firebase Auth (${found.id})` : 'Firebase Bootstrap Owner',
    })

    const response = NextResponse.json({ ok: true, user: { name, role } })
    response.cookies.set(
      SESSION_COOKIE,
      createToken({ username: email, role }),
      sessionCookieOptions(),
    )
    return response
  }

  // --- 2. Fallback Username/Password Authentication ---
  const user = await verifyLogin(username, password)
  if (!user) {
    await audit({
      request,
      actor: username.trim().toLowerCase().slice(0, 40) || 'unknown',
      role: 'none',
      action: 'sign-in-refused',
    })
    return NextResponse.json({ error: 'Incorrect email or password' }, { status: 401 })
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
