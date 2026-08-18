import { NextResponse } from 'next/server'

import { appendRecord } from '@/lib/content'
import { fetchPayment, isConfigured, verifyPaymentSignature } from '@/lib/razorpay'

export const runtime = 'nodejs'

const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')

function clean(value: unknown, limit: number) {
  return String(value ?? '')
    .replace(CONTROL_CHARS, ' ')
    .trim()
    .slice(0, limit)
}

/**
 * Called by the browser the moment Razorpay's checkout reports success. The
 * signature is checked first, and then the payment is read back from Razorpay
 * — the amount written into the parish record is the one Razorpay confirms,
 * never the one the browser claims.
 */
export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: 'Online giving is not switched on' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const orderId = clean(body.razorpay_order_id, 80)
  const paymentId = clean(body.razorpay_payment_id, 80)
  const signature = clean(body.razorpay_signature, 200)

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: 'Incomplete payment details' }, { status: 422 })
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

  const captured = payment.status === 'captured' || payment.status === 'authorized'

  await appendRecord('donations', {
    paymentId: payment.id,
    orderId,
    // Stored in rupees, the way the parish accounts are kept.
    amount: payment.amount / 100,
    currency: payment.currency,
    status: payment.status,
    method: payment.method ?? '',
    fund: payment.notes?.fund ?? '',
    fundName: payment.notes?.fundName ?? '',
    donor: payment.notes?.donor ?? 'Anonymous',
    intention: payment.notes?.intention ?? '',
    email: payment.email ?? clean(body.email, 160),
    phone: payment.contact ?? clean(body.phone, 40),
    at: new Date().toISOString(),
  })

  return NextResponse.json({
    ok: captured,
    paymentId: payment.id,
    amount: payment.amount / 100,
    status: payment.status,
  })
}
