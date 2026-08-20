import path from 'node:path'

import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { appendRecord, readContent, readRecords, writeJson } from '@/lib/content'
import type { HallBooking } from '@/lib/hall'
import { isFree } from '@/lib/hall'
import { readCalendar } from '@/lib/hall-server'
import type { HallContent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FILE = path.join(process.cwd(), 'content', 'hall-bookings.json')
const STATUSES = new Set(['pending', 'confirmed', 'declined'])

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const bookings = (await readRecords('hall-bookings')) as HallBooking[]
  return NextResponse.json({ bookings }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Confirm or decline one request. Everything else about it stays as sent. */
export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let id = ''
  let status = ''
  try {
    const body = await request.json()
    id = String(body?.id ?? '')
    status = String(body?.status ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: 'Need a booking id and a status' }, { status: 422 })
  }

  const bookings = (await readRecords('hall-bookings')) as HallBooking[]
  const booking = bookings.find((entry) => entry.id === id)
  if (!booking) return NextResponse.json({ error: 'No such booking' }, { status: 404 })

  booking.status = status as HallBooking['status']
  booking.decidedAt = new Date().toISOString()

  // Same atomic write the content editor uses: a crash never truncates the file.
  await writeJson(FILE, bookings)

  return NextResponse.json({ ok: true, booking })
}

/**
 * An offline booking, taken at the parish office counter. It is confirmed from
 * the first moment — somebody stood there and paid — and it goes through the
 * same clash check as a request from the website.
 */
export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const hall = await readContent<HallContent>('hall')
  const hallId = String(body?.hall ?? '')
  const date = String(body?.date ?? '')
  const session = String(body?.session ?? '')

  if (!hall.halls.some((room) => room.id === hallId)) {
    return NextResponse.json({ error: 'Choose one of the halls.' }, { status: 422 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !hall.sessions.some((s) => s.id === session)) {
    return NextResponse.json({ error: 'Choose a date and a session.' }, { status: 422 })
  }

  const calendar = await readCalendar(hall)
  if (!isFree(hall, calendar, hallId, date, session)) {
    return NextResponse.json({ error: 'That hall is already taken then.' }, { status: 409 })
  }

  const record: HallBooking = {
    id: `hb${Date.now().toString(36)}`,
    hall: hallId,
    date,
    session,
    status: 'confirmed',
    name: String(body?.name ?? '').trim().slice(0, 120) || 'Booked at the parish office',
    phone: String(body?.phone ?? '').trim().slice(0, 40),
    email: String(body?.email ?? '').trim().slice(0, 160),
    purpose: String(body?.purpose ?? '').trim().slice(0, 160),
    guests: Math.max(0, Math.min(2000, Number(body?.guests) || 0)),
    amenities: Array.isArray(body?.amenities)
      ? (body.amenities as unknown[])
          .map((id) => String(id))
          .filter((id) => hall.halls.find((room) => room.id === hallId)?.amenities.includes(id))
      : [],
    message: String(body?.message ?? '').trim().slice(0, 2000),
    at: new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  }

  await appendRecord('hall-bookings', record)
  return NextResponse.json({ ok: true, booking: record })
}

/** Frees a slot outright — a walk-in who cancelled, or an entry made in error. */
export async function DELETE(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let id = ''
  try {
    id = String((await request.json())?.id ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'Need a booking id' }, { status: 422 })

  const bookings = (await readRecords('hall-bookings')) as HallBooking[]
  const left = bookings.filter((entry) => entry.id !== id)
  if (left.length === bookings.length) {
    return NextResponse.json({ error: 'No such booking' }, { status: 404 })
  }

  await writeJson(FILE, left)

  return NextResponse.json({ ok: true })
}
