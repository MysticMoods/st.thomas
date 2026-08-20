import path from 'node:path'

import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { readContent, readRecords, writeJson } from '@/lib/content'
import type { HallBooking } from '@/lib/hall'
import { hallDecided } from '@/lib/letters'
import { throttled } from '@/lib/limit'
import { post } from '@/lib/mail'
import { createOrder, fetchPayment, isConfigured, keyId, verifyPaymentSignature } from '@/lib/razorpay'
import type { HallContent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FILE = path.join(process.cwd(), 'content', 'hall-bookings.json')

/**
 * Paying the hall advance without coming to the office.
 *
 * A request holds a day for seven days and becomes a booking only when the
 * advance arrives, which until now meant a trip to the counter — so half the
 * calendar sat in "held" waiting for somebody's Saturday. This does the same
 * job over Razorpay.
 *
 * It follows the donation flow's two rules exactly, and for the same reason:
 * the signature is checked before anything is believed, and the amount is read
 * back from Razorpay rather than taken from the browser. A booking is confirmed
 * only when both agree.
 */

/** Starts a payment for one booking. */
export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Online payment is not set up. Please pay the advance at the parish office.' },
      { status: 503 },
    )
  }
  if (throttled(request, 'hall-advance', 10)) {
    return NextResponse.json({ error: 'Please try again shortly.' }, { status: 429 })
  }

  let id = ''
  try {
    id = String((await request.json())?.id ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const bookings = (await readRecords('hall-bookings')) as HallBooking[]
  const booking = bookings.find((entry) => entry.id === id)
  if (!booking) return NextResponse.json({ error: 'No such booking' }, { status: 404 })
  if (booking.status === 'declined') {
    return NextResponse.json({ error: 'That request has been set aside.' }, { status: 409 })
  }
  if (booking.status === 'confirmed') {
    return NextResponse.json({ error: 'That booking is already confirmed.' }, { status: 409 })
  }

  const hall = await readContent<HallContent>('hall')
  const advance = Math.max(1, Math.round(hall.booking.advance))

  const order = await createOrder({
    amount: advance * 100,
    receipt: `hall-${booking.id}`.slice(0, 40),
    notes: {
      kind: 'hall-advance',
      bookingId: booking.id,
      hall: booking.hall,
      date: booking.date,
      session: booking.session,
      name: booking.name.slice(0, 60),
    },
  })

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: keyId(),
    booking: { id: booking.id, name: booking.name, email: booking.email },
  })
}

/**
 * Confirms the payment and, only then, the booking.
 *
 * Everything here is checked against Razorpay rather than against what the
 * browser says: the signature, the order the payment belongs to, the amount,
 * and which booking the order was raised for.
 */
export async function PUT(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const orderId = String(body?.orderId ?? '')
  const paymentId = String(body?.paymentId ?? '')
  const signature = String(body?.signature ?? '')

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: 'This payment could not be verified' }, { status: 400 })
  }
  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    return NextResponse.json({ error: 'This payment could not be verified' }, { status: 400 })
  }

  let payment
  try {
    payment = await fetchPayment(paymentId)
  } catch {
    return NextResponse.json(
      { error: 'The payment went through but could not be confirmed. Please call the office.' },
      { status: 502 },
    )
  }

  if (payment.order_id && payment.order_id !== orderId) {
    return NextResponse.json({ error: 'This payment could not be verified' }, { status: 400 })
  }
  if (payment.status !== 'captured' && payment.status !== 'authorized') {
    return NextResponse.json({ error: 'That payment did not go through.' }, { status: 402 })
  }

  // Which booking this was for comes from the order we raised, never from the
  // browser, so nobody can pay for one day and confirm another.
  const bookingId = String(payment.notes?.bookingId ?? '')
  if (!bookingId || payment.notes?.kind !== 'hall-advance') {
    return NextResponse.json({ error: 'This payment could not be verified' }, { status: 400 })
  }

  const hall = await readContent<HallContent>('hall')
  const advance = Math.max(1, Math.round(hall.booking.advance))
  if (payment.amount < advance * 100) {
    return NextResponse.json({ error: 'That is less than the advance.' }, { status: 402 })
  }

  const bookings = (await readRecords('hall-bookings')) as HallBooking[]
  const booking = bookings.find((entry) => entry.id === bookingId)
  if (!booking) return NextResponse.json({ error: 'No such booking' }, { status: 404 })

  booking.status = 'confirmed'
  booking.decidedAt = new Date().toISOString()
  booking.message = `${booking.message ? `${booking.message} — ` : ''}Advance of ₹${advance} paid online, ${payment.id}.`.slice(0, 2000)

  await writeJson(FILE, bookings)

  const room = hall.halls.find((entry) => entry.id === booking.hall)
  const slot = hall.sessions.find((entry) => entry.id === booking.session)
  post(
    hallDecided(
      booking,
      room?.name.en ?? booking.hall,
      slot?.label.en ?? booking.session,
      'confirmed',
      hall.booking.contact.phone,
    ),
  )

  await audit({
    request,
    actor: booking.name.slice(0, 60) || 'online payment',
    role: 'visitor',
    action: 'hall-advance',
    target: booking.id,
    detail: `₹${advance} paid, ${payment.id}`,
  })

  return NextResponse.json({ ok: true, booking: { id: booking.id, status: booking.status } })
}
