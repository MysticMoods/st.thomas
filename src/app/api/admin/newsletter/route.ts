import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { currentSession } from '@/lib/auth'
import { newsletter } from '@/lib/letters'
import { mailConfigured, send } from '@/lib/mail'
import { liveSubscribers } from '@/lib/subscribers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Posted in small batches, with a breath between, so no server takes offence. */
const BATCH = 20
const PAUSE = 900

/** Who would receive the next letter, and whether it could be posted at all. */
export async function GET() {
  if (!(await currentSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const live = await liveSubscribers()
  return NextResponse.json(
    {
      subscribers: live.length,
      configured: mailConfigured(),
      addresses: live.slice(0, 8).map((entry) => entry.email),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * Sends one letter to everybody on the list.
 *
 * A test send goes only to the address given, so nobody has to find out how the
 * letter reads by posting it to four hundred people.
 */
export async function POST(request: Request) {
  const session = await currentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const subject = String(body?.subject ?? '').trim().slice(0, 160)
  const message = String(body?.body ?? '').trim().slice(0, 20000)
  const testTo = String(body?.testTo ?? '').trim()

  if (!subject) return NextResponse.json({ error: 'Give the letter a subject.' }, { status: 422 })
  if (message.length < 20) {
    return NextResponse.json({ error: 'Write a little more than that.' }, { status: 422 })
  }

  if (testTo) {
    if (!testTo.includes('@')) {
      return NextResponse.json({ error: 'That is not an address.' }, { status: 422 })
    }
    const one = await send(newsletter(testTo, subject, message, 'test-token-not-a-real-subscriber'))
    return NextResponse.json({ ok: one.status === 'sent', test: true, result: one })
  }

  const live = await liveSubscribers()
  if (live.length === 0) {
    return NextResponse.json({ error: 'Nobody is on the list yet.' }, { status: 422 })
  }

  let sent = 0
  let failed = 0
  for (let i = 0; i < live.length; i += BATCH) {
    const batch = live.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map((entry) => send(newsletter(entry.email, subject, message, entry.token))),
    )
    for (const result of results) {
      if (result.status === 'sent') sent += 1
      else failed += 1
    }
    if (i + BATCH < live.length) await new Promise((resolve) => setTimeout(resolve, PAUSE))
  }

  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'newsletter-send',
    target: subject,
    detail: `${sent} sent, ${failed} not delivered, ${live.length} on the list`,
  })

  return NextResponse.json({ ok: true, sent, failed, total: live.length })
}
