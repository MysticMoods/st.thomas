import { NextResponse } from 'next/server'

import { appendRecord, readRecords } from '@/lib/content'
import { verifyWebhookSignature } from '@/lib/razorpay'

export const runtime = 'nodejs'

type Payment = {
  id?: string
  order_id?: string
  amount?: number
  currency?: string
  status?: string
  method?: string
  email?: string
  contact?: string
  notes?: Record<string, string>
}

/**
 * Razorpay's server-to-server notification. This is the safety net for the case
 * where the payment succeeds but the visitor closes the tab before the browser
 * can call /api/donate/verify — without it, money would arrive in the parish
 * account with nothing in the record to explain it.
 *
 * Set RAZORPAY_WEBHOOK_SECRET and point the dashboard's webhook at
 * https://<site>/api/donate/webhook for the events payment.captured and
 * payment.failed.
 */
export async function POST(request: Request) {
  const signature = request.headers.get('x-razorpay-signature') ?? ''
  // The raw text is needed byte for byte — re-serialising the parsed JSON would
  // change the digest and every notification would be rejected.
  const raw = await request.text()

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { event?: string; payload?: { payment?: { entity?: Payment } } }
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const payment = event.payload?.payment?.entity
  if (!payment?.id || !event.event?.startsWith('payment.')) {
    // Anything else is acknowledged and ignored, so Razorpay stops retrying.
    return NextResponse.json({ ok: true, ignored: true })
  }

  // The browser usually gets here first. Do not write the same payment twice.
  const existing = (await readRecords('donations')) as { paymentId?: string }[]
  if (existing.some((record) => record.paymentId === payment.id)) {
    return NextResponse.json({ ok: true, duplicate: true })
  }

  await appendRecord('donations', {
    paymentId: payment.id,
    orderId: payment.order_id ?? '',
    amount: (payment.amount ?? 0) / 100,
    currency: payment.currency ?? 'INR',
    status: payment.status ?? event.event.replace('payment.', ''),
    method: payment.method ?? '',
    fund: payment.notes?.fund ?? '',
    fundName: payment.notes?.fundName ?? '',
    donor: payment.notes?.donor ?? 'Anonymous',
    intention: payment.notes?.intention ?? '',
    email: payment.email ?? '',
    phone: payment.contact ?? '',
    at: new Date().toISOString(),
    via: 'webhook',
  })

  return NextResponse.json({ ok: true })
}
