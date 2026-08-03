import { NextResponse } from 'next/server'

import { appendRecord } from '@/lib/content'
import { isEmail } from '@/lib/utils'

export const runtime = 'nodejs'

const MAX = { name: 120, email: 160, phone: 40, subject: 160, message: 4000 }

const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')

/** Trim, drop control characters, and cap the length of a submitted field. */
function clean(value: unknown, limit: number) {
  return String(value ?? '')
    .replace(CONTROL_CHARS, ' ')
    .trim()
    .slice(0, limit)
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const record = {
    name: clean(body.name, MAX.name),
    email: clean(body.email, MAX.email),
    phone: clean(body.phone, MAX.phone),
    subject: clean(body.subject, MAX.subject),
    message: clean(body.message, MAX.message),
    at: new Date().toISOString(),
  }

  if (!record.name || !isEmail(record.email) || !record.message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 })
  }

  await appendRecord('messages', record)
  return NextResponse.json({ ok: true })
}
