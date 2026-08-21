import { NextResponse } from 'next/server'

import { appendRecord } from '@/lib/content'
import { contactToOffice, contactToSender } from '@/lib/letters'
import { looksAutomated, throttled } from '@/lib/limit'
import { officeAddress, post } from '@/lib/mail'
import { isEmail } from '@/lib/utils'

export const runtime = 'nodejs'

const MAX = { name: 120, email: 160, phone: 40, subject: 160, message: 4000 }

/** Messages allowed from one address per hour. */
const LIMIT = Number(process.env.CONTACT_LIMIT) || 5

const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')

/** Trim, drop control characters, and cap the length of a submitted field. */
function clean(value: unknown, limit: number) {
  return String(value ?? '')
    .replace(CONTROL_CHARS, ' ')
    .trim()
    .slice(0, limit)
}

export async function POST(request: Request) {
  if (throttled(request, 'contact', LIMIT)) {
    return NextResponse.json(
      { error: 'That is several messages already. Please telephone the office instead.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // A robot fills the field nobody can see. Answer as though it worked, so
  // whoever sent it has nothing to learn and nothing to adjust.
  if (looksAutomated(body)) return NextResponse.json({ ok: true })

  const record = {
    id: `m${Date.now().toString(36)}`,
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

  // The office hears about it, and the sender knows it arrived. Neither letter
  // is waited for: the message is already saved.
  if (officeAddress()) post(contactToOffice(record))
  post(contactToSender(record))

  return NextResponse.json({ ok: true })
}
