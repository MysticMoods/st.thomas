import { promises as fs } from 'node:fs'
import path from 'node:path'

import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { readRecords } from '@/lib/content'
import type { HallBooking } from '@/lib/hall'

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
  const temp = `${FILE}.${process.pid}.tmp`
  await fs.writeFile(temp, JSON.stringify(bookings, null, 2) + '\n', 'utf-8')
  await fs.rename(temp, FILE)

  return NextResponse.json({ ok: true, booking })
}
