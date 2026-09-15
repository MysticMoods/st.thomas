import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { SESSION_COOKIE, currentSession } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await currentSession()
  if (session) {
    await audit({ request, actor: session.username, role: session.role, action: 'sign-out' })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return response
}
