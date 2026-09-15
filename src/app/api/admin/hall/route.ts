import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { requireArea } from '@/lib/auth'
import { appendRecord, readContent, readRecords, updateRecords } from '@/lib/content'
import type { HallBooking } from '@/lib/hall'
import { isFree } from '@/lib/hall'
import { readCalendar } from '@/lib/hall-server'
import { recordId } from '@/lib/ids'
import { hallDecided } from '@/lib/letters'
import { post } from '@/lib/mail'
import type { HallContent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = new Set(['pending', 'confirmed', 'declined'])

export async function GET() {
  if (!(await requireArea('hall'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const bookings = (await readRecords('hall-bookings')) as HallBooking[]
  return NextResponse.json({ bookings }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Confirm or decline one request. Everything else about it stays as sent. */
export async function PATCH(request: Request) {
  const staff = await requireArea('hall')
  if (!staff) {
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

  // Read, change and write as one operation. Reading the list here and writing
  // it back separately would drop any booking that arrived in between, and
  // would write to the disk even on a deployment that keeps its records
  // elsewhere.
  let booking: HallBooking | undefined
  await updateRecords<HallBooking>('hall-bookings', (all) => {
    booking = all.find((entry) => entry.id === id)
    if (!booking) return all
    booking.status = status as HallBooking['status']
    booking.decidedAt = new Date().toISOString()
    return all
  })
  if (!booking) return NextResponse.json({ error: 'No such booking' }, { status: 404 })
  const decided = booking

  // The family should hear the decision from the parish, not from the calendar
  // quietly changing colour.
  if (status === 'confirmed' || status === 'declined') {
    const hall = await readContent<HallContent>('hall')
    const room = hall.halls.find((entry) => entry.id === decided.hall)
    const slot = hall.sessions.find((entry) => entry.id === decided.session)
    post(
      hallDecided(
        decided,
        room?.name.en ?? booking.hall,
        slot?.label.en ?? booking.session,
        status,
        hall.booking.contact.phone,
      ),
    )
  }

  await audit({
    request,
    actor: staff.username,
    role: staff.role,
    action: 'hall-decide',
    target: decided.id,
    detail: `${decided.hall} ${decided.date} ${decided.session} -> ${status} (${decided.name})`,
  })

  return NextResponse.json({ ok: true, booking: decided })
}

/**
 * An offline booking, taken at the parish office counter. It is confirmed from
 * the first moment — somebody stood there and paid — and it goes through the
 * same clash check as a request from the website.
 */
export async function POST(request: Request) {
  const staff = await requireArea('hall')
  if (!staff) {
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
    id: recordId('hb'),
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
  await audit({
    request,
    actor: staff.username,
    role: staff.role,
    action: 'hall-book',
    target: record.id,
    detail: `${record.hall} ${record.date} ${record.session} for ${record.name}`,
  })
  return NextResponse.json({ ok: true, booking: record })
}

/** Frees a slot outright — a walk-in who cancelled, or an entry made in error. */
export async function DELETE(request: Request) {
  const staff = await requireArea('hall')
  if (!staff) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let id = ''
  try {
    id = String((await request.json())?.id ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'Need a booking id' }, { status: 422 })

  let gone: HallBooking | undefined
  await updateRecords<HallBooking>('hall-bookings', (all) => {
    gone = all.find((entry) => entry.id === id)
    return gone ? all.filter((entry) => entry.id !== id) : all
  })
  if (!gone) return NextResponse.json({ error: 'No such booking' }, { status: 404 })
  await audit({
    request,
    actor: staff.username,
    role: staff.role,
    action: 'hall-free',
    target: id,
    detail: gone ? `${gone.hall} ${gone.date} ${gone.session} (${gone.name})` : undefined,
  })

  return NextResponse.json({ ok: true })
}
