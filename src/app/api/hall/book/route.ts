import { NextResponse } from 'next/server'

import { appendRecord, readContent } from '@/lib/content'
import { bookingWindow, isFree } from '@/lib/hall'
import { readCalendar } from '@/lib/hall-server'
import type { HallContent } from '@/lib/types'
import { isEmail } from '@/lib/utils'

export const runtime = 'nodejs'

const MAX = { name: 120, email: 160, phone: 40, purpose: 160, message: 2000 }
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')

/**
 * Six requests an hour from one address. A family needs one; a hall touting for
 * mischief needs many. Raise HALL_BOOKING_LIMIT if a shared office connection
 * ever trips over it.
 */
const attempts = new Map<string, { count: number; until: number }>()
const WINDOW = 60 * 60 * 1000
const LIMIT = Number(process.env.HALL_BOOKING_LIMIT) || 6

function throttled(ip: string) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.until < now) {
    attempts.set(ip, { count: 1, until: now + WINDOW })
    return false
  }
  entry.count += 1
  return entry.count > LIMIT
}

function clean(value: unknown, limit: number) {
  return String(value ?? '')
    .replace(CONTROL_CHARS, ' ')
    .trim()
    .slice(0, limit)
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'

  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Several requests have come from here already. Please ring the parish office.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const hall = await readContent<HallContent>('hall')

  const date = clean(body.date, 10)
  const session = clean(body.session, 40)
  const hallId = clean(body.hall, 40)
  const room = hall.halls.find((entry) => entry.id === hallId)
  const record = {
    id: `hb${Date.now().toString(36)}`,
    hall: hallId,
    date,
    session,
    status: 'pending' as const,
    name: clean(body.name, MAX.name),
    email: clean(body.email, MAX.email),
    phone: clean(body.phone, MAX.phone),
    purpose: clean(body.purpose, MAX.purpose),
    guests: Math.max(0, Math.min(2000, Number(body.guests) || 0)),
    // Only the extras this particular room can actually offer.
    amenities: Array.isArray(body.amenities)
      ? body.amenities
          .map((id) => clean(id, 40))
          .filter((id) => room?.amenities.includes(id))
      : [],
    message: clean(body.message, MAX.message),
    at: new Date().toISOString(),
  }

  if (!record.name || !record.phone || !isEmail(record.email)) {
    return NextResponse.json(
      { error: 'Name, phone number and a valid email address are needed.' },
      { status: 422 },
    )
  }

  if (!room) {
    return NextResponse.json({ error: 'Choose one of the halls.' }, { status: 422 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !hall.sessions.some((s) => s.id === session)) {
    return NextResponse.json({ error: 'Choose a date and a session.' }, { status: 422 })
  }

  const window = bookingWindow(hall)
  if (date < window.first || date > window.last) {
    return NextResponse.json(
      {
        error: `The hall is booked between ${window.first} and ${window.last}. For anything outside that, please ring the office.`,
      },
      { status: 422 },
    )
  }

  // Re-read the calendar here rather than trusting what the page believed: two
  // families can be filling the form for the same Saturday at the same moment.
  const calendar = await readCalendar(hall)
  if (!isFree(hall, calendar, hallId, date, session)) {
    return NextResponse.json(
      { error: 'That hall has just been taken for this session. Please choose another date.', taken: true },
      { status: 409 },
    )
  }

  await appendRecord('hall-bookings', record)
  return NextResponse.json({ ok: true, id: record.id })
}
