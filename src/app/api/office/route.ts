import { NextResponse } from 'next/server'

import { appendRecord, readContent, readRecords } from '@/lib/content'
import { recordId } from '@/lib/ids'
import { officeRequestToOffice, officeRequestToSender } from '@/lib/letters'
import { looksAutomated, throttled } from '@/lib/limit'
import { officeAddress, post } from '@/lib/mail'
import type { OfficeContent } from '@/lib/types'
import { isEmail } from '@/lib/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The three things people walk into the parish office to ask for: a Mass
 * offered for somebody, a certificate copied out of the registers, and a
 * prayer. They share one route because they share everything that matters —
 * the same throttle, the same hidden field, the same acknowledgement, the same
 * queue in the dashboard — and differ only in what is asked.
 */

const CONTROL = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')
const LIMIT = Number(process.env.OFFICE_LIMIT) || 6

export type OfficeKind = 'intentions' | 'certificates' | 'prayers'

export type OfficeRequest = {
  id: string
  kind: OfficeKind
  status: 'pending' | 'done' | 'declined'
  /** Which sort of Mass, which certificate. Empty for a prayer. */
  type: string
  /** The date a Mass is asked for. */
  date?: string
  /** Who or what it is for. */
  subject: string
  detail: string
  name: string
  phone: string
  email: string
  /** True when a prayer may be printed in the notices. */
  mayPublish?: boolean
  at: string
  decidedAt?: string
  note?: string
}

function clean(value: unknown, limit: number) {
  return String(value ?? '')
    .replace(CONTROL, ' ')
    .trim()
    .slice(0, limit)
}

/** Only the dates the office has said it can take. */
function withinWindow(date: string, noticeDays: number, monthsAhead: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const first = new Date()
  first.setDate(first.getDate() + Math.max(0, noticeDays))
  const last = new Date()
  last.setMonth(last.getMonth() + Math.max(1, monthsAhead))
  const key = (at: Date) =>
    `${at.getFullYear()}-${`${at.getMonth() + 1}`.padStart(2, '0')}-${`${at.getDate()}`.padStart(2, '0')}`
  return date >= key(first) && date <= key(last)
}

/**
 * Which days already have a Mass intention written against them, so the form
 * can grey them out. Only the dates — never who asked, or for whom.
 */
export async function GET() {
  const taken = ((await readRecords('intentions')) as OfficeRequest[])
    .filter((entry) => entry.status !== 'declined' && entry.date)
    .map((entry) => entry.date as string)

  return NextResponse.json({ taken: [...new Set(taken)] }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  if (throttled(request, 'office', LIMIT)) {
    return NextResponse.json(
      { error: 'That is several requests already. Please telephone the office instead.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (looksAutomated(body)) return NextResponse.json({ ok: true, id: 'ignored' })

  const kind = clean(body.kind, 20) as OfficeKind
  if (!['intentions', 'certificates', 'prayers'].includes(kind)) {
    return NextResponse.json({ error: 'Unknown request' }, { status: 422 })
  }

  const office = await readContent<OfficeContent>('office')

  const record: OfficeRequest = {
    id: recordId(`${kind[0]}r`),
    kind,
    status: 'pending',
    type: clean(body.type, 40),
    subject: clean(body.subject, 200),
    detail: clean(body.detail, 2000),
    name: clean(body.name, 120),
    phone: clean(body.phone, 40),
    email: clean(body.email, 160),
    at: new Date().toISOString(),
  }

  if (!record.name) {
    return NextResponse.json({ error: 'Please give your name.' }, { status: 422 })
  }
  // A prayer needs no reply, so it asks for no way to make one. The other two
  // do: a certificate has to be collected and a Mass has to be told to somebody.
  if (kind !== 'prayers' && !record.phone && !isEmail(record.email)) {
    return NextResponse.json(
      { error: 'Leave a telephone number or an email address, so the office can reply.' },
      { status: 422 },
    )
  }

  if (kind === 'intentions') {
    const date = clean(body.date, 10)
    if (!office.intentions.types.some((entry) => entry.id === record.type)) {
      return NextResponse.json({ error: 'Choose what the Mass is for.' }, { status: 422 })
    }
    if (!withinWindow(date, office.intentions.noticeDays, office.intentions.monthsAhead)) {
      return NextResponse.json(
        { error: `Choose a day at least ${office.intentions.noticeDays} days from now.` },
        { status: 422 },
      )
    }
    if (!record.subject) {
      return NextResponse.json({ error: 'Say who the Mass is for.' }, { status: 422 })
    }
    // One intention to a Mass, so a day already spoken for is refused here
    // rather than discovered at the counter.
    const taken = ((await readRecords('intentions')) as OfficeRequest[]).some(
      (entry) => entry.date === date && entry.status !== 'declined',
    )
    if (taken) {
      return NextResponse.json(
        { error: 'That day is already taken. Please choose another.', taken: true },
        { status: 409 },
      )
    }
    record.date = date
  }

  if (kind === 'certificates') {
    if (!office.certificates.types.some((entry) => entry.id === record.type)) {
      return NextResponse.json({ error: 'Choose which certificate you need.' }, { status: 422 })
    }
    if (!record.subject) {
      return NextResponse.json(
        { error: 'Give the name it should be made out in.' },
        { status: 422 },
      )
    }
  }

  if (kind === 'prayers') {
    if (!record.detail) {
      return NextResponse.json({ error: 'Write what you would like prayed for.' }, { status: 422 })
    }
    record.mayPublish = body.mayPublish === true
  }

  await appendRecord(kind, record)

  const label =
    kind === 'intentions'
      ? office.intentions.types.find((entry) => entry.id === record.type)?.label.en ?? 'Holy Mass'
      : kind === 'certificates'
        ? office.certificates.types.find((entry) => entry.id === record.type)?.label.en ?? 'Certificate'
        : 'Prayer request'

  if (officeAddress()) post(officeRequestToOffice(record, label))
  if (isEmail(record.email)) {
    post(officeRequestToSender(record, label, office.certificates.days))
  }

  return NextResponse.json({ ok: true, id: record.id })
}
