import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { currentSession } from '@/lib/auth'
import { type Area, may } from '@/lib/permissions'
import { readRecords, updateRecords } from '@/lib/content'
import { replyToPerson } from '@/lib/letters'
import { send } from '@/lib/mail'
import {
  MAX_REPLY,
  type Answerable,
  type Reply,
  type ReplyChannel,
  recordKey,
} from '@/lib/reply'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The parish office answering somebody, from the dashboard.
 *
 * Whichever way the answer goes out, it is written down against the message it
 * answers — so a second person opening the dashboard can see that a family has
 * already been telephoned back, rather than telephoning them again.
 *
 * Email is sent here and its outcome recorded honestly, including when there is
 * no mail server and nothing was delivered. WhatsApp and the office's own mail
 * programme are opened by the browser, so all this route can record is that the
 * office took it up; it never claims either of those was received.
 */

const CONTROL = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')

/** Only records that carry somebody to reply to may be replied to. */
const LISTS = new Set(['messages', 'hall-bookings', 'intentions', 'certificates', 'prayers'])

/**
 * Writing to somebody in the parish's name is the work of whoever holds that
 * queue. A hall manager answers the family booking the hall; they have no
 * business answering a request for a baptism certificate, and the reply would
 * go out over the parish's name either way.
 */
const LIST_AREA: Record<string, Area> = {
  messages: 'messages',
  'hall-bookings': 'hall',
  intentions: 'office',
  certificates: 'office',
  prayers: 'office',
}

type List = 'messages' | 'hall-bookings' | 'intentions' | 'certificates' | 'prayers'

function clean(value: unknown, limit: number) {
  return String(value ?? '')
    .replace(CONTROL, (match) => (match.includes('\n') ? '\n' : ' '))
    .trim()
    .slice(0, limit)
}

/** What the original message said, for quoting back and for the subject line. */
function original(record: Answerable & { message?: string; detail?: string; subject?: string }) {
  return record.message || record.detail || ''
}

export async function POST(request: Request) {
  const session = await currentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const list = clean(body.list, 40) as List
  const key = clean(body.key, 80)
  const text = clean(body.text, MAX_REPLY)
  const asked = clean(body.channel, 20)
  const channel: ReplyChannel = (['whatsapp', 'mail-app'] as const).includes(
    asked as 'whatsapp' | 'mail-app',
  )
    ? (asked as ReplyChannel)
    : 'email'

  if (!LISTS.has(list)) {
    return NextResponse.json({ error: 'Unknown list' }, { status: 422 })
  }
  if (!may(session.role, LIST_AREA[list])) {
    return NextResponse.json(
      { error: 'That is not yours to answer.' },
      { status: 403 },
    )
  }
  if (!key) return NextResponse.json({ error: 'Which message?' }, { status: 422 })
  if (text.length < 2) {
    return NextResponse.json({ error: 'Write something to send.' }, { status: 422 })
  }

  const records = (await readRecords(list)) as (Answerable & { message?: string; subject?: string })[]
  const record = records.find((entry) => recordKey(entry) === key)
  if (!record) return NextResponse.json({ error: 'No such message' }, { status: 404 })

  let reply: Reply = {
    text,
    by: session.username,
    at: new Date().toISOString(),
    channel,
    status: 'handed-over',
  }

  // A channel the office carries out itself is only written down. Nothing here
  // sends it, so nothing here may claim it was sent.
  if (channel === 'mail-app' && !record.email) {
    return NextResponse.json(
      { error: 'This one left no email address. Use WhatsApp or the telephone.' },
      { status: 422 },
    )
  }

  if (channel === 'email') {
    if (!record.email) {
      return NextResponse.json(
        { error: 'This one left no email address. Use WhatsApp or the telephone.' },
        { status: 422 },
      )
    }
    // Waited for, unlike the letters a visitor triggers: the office is standing
    // there and wants to know whether it went.
    const sent = await send(
      replyToPerson({
        to: record.email,
        name: record.name,
        subject: record.subject
          ? `Re: ${record.subject}`
          : 'A word from St. Thomas Church, Mangalassery',
        reply: text,
        original: original(record),
      }),
    )
    reply = { ...reply, status: sent.status, error: sent.error }
  }

  await updateRecords<Answerable>(list, (all) =>
    all.map((entry) =>
      recordKey(entry) === key ? { ...entry, replies: [...(entry.replies ?? []), reply] } : entry,
    ),
  )

  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'reply',
    target: key,
    detail: `${channel} · ${reply.status}`,
  })

  return NextResponse.json({ ok: true, reply })
}
