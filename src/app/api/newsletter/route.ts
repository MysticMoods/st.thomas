import { NextResponse } from 'next/server'

import { subscribeWelcome } from '@/lib/letters'
import { looksAutomated, throttled } from '@/lib/limit'
import { post } from '@/lib/mail'
import { subscribe, unsubscribe } from '@/lib/subscribers'
import { isEmail } from '@/lib/utils'

export const runtime = 'nodejs'

/** Sign-ups allowed from one address per hour. */
const LIMIT = Number(process.env.NEWSLETTER_LIMIT) || 5

export async function POST(request: Request) {
  if (throttled(request, 'newsletter', LIMIT)) {
    return NextResponse.json({ error: 'Please try again later.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (looksAutomated(body)) return NextResponse.json({ ok: true })

  const email = String(body?.email ?? '').trim()
  if (!isEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 422 })
  }

  const { token, fresh } = await subscribe(email)
  // Only greet somebody who has actually just joined — pressing the button
  // twice should not post the same letter twice.
  if (fresh) post(subscribeWelcome(email, token))

  return NextResponse.json({ ok: true })
}

/**
 * Leaving. A GET so that the link in a letter works on the first click, from
 * any mail client, without asking anybody to sign in or confirm.
 */
export async function DELETE(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!token) return NextResponse.json({ error: 'No token' }, { status: 422 })

  const email = await unsubscribe(token)
  if (!email) return NextResponse.json({ error: 'That link is not one of ours' }, { status: 404 })

  return NextResponse.json({ ok: true, email })
}
