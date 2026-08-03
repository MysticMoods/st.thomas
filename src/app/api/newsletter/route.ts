import { NextResponse } from 'next/server'

import { appendRecord } from '@/lib/content'
import { isEmail } from '@/lib/utils'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let email = ''
  try {
    const body = await request.json()
    email = String(body?.email ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!isEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 422 })
  }

  await appendRecord('subscribers', { email, at: new Date().toISOString() })
  return NextResponse.json({ ok: true })
}
