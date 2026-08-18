import { NextResponse } from 'next/server'

import { readContent } from '@/lib/content'
import { createOrder, isConfigured, keyId } from '@/lib/razorpay'
import type { DonationContent } from '@/lib/types'
import { isEmail } from '@/lib/utils'

export const runtime = 'nodejs'

/** Ten orders per IP per ten minutes — enough for a family, not for a script. */
const attempts = new Map<string, { count: number; until: number }>()
const WINDOW = 10 * 60 * 1000
const LIMIT = 10

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

const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')

function clean(value: unknown, limit: number) {
  return String(value ?? '')
    .replace(CONTROL_CHARS, ' ')
    .trim()
    .slice(0, limit)
}

export async function POST(request: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          'Online giving is not switched on yet. Please use the bank or UPI details shown beside this form.',
      },
      { status: 503 },
    )
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'

  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // The limits and the list of funds come from the content file, so the vicar
  // can change either from the dashboard without touching this route.
  const donation = await readContent<DonationContent>('donation')

  const fundId = clean(body.fund, 40)
  const fund = donation.funds.find((f) => f.id === fundId)
  if (!fund) {
    return NextResponse.json({ error: 'Choose what the gift is for' }, { status: 422 })
  }

  const rupees = Math.floor(Number(body.amount))
  if (!Number.isFinite(rupees) || rupees < donation.minAmount || rupees > donation.maxAmount) {
    return NextResponse.json(
      { error: `Enter an amount between ₹${donation.minAmount} and ₹${donation.maxAmount}.` },
      { status: 422 },
    )
  }

  const name = clean(body.name, 120)
  const email = clean(body.email, 160)
  const phone = clean(body.phone, 40)
  const intention = clean(body.intention, 300)

  if (email && !isEmail(email)) {
    return NextResponse.json({ error: 'That email address does not look right' }, { status: 422 })
  }

  try {
    const order = await createOrder({
      // Razorpay counts in paise.
      amount: rupees * 100,
      receipt: `stc-${Date.now()}`,
      notes: {
        fund: fund.id,
        fundName: fund.title.en,
        donor: name || 'Anonymous',
        intention,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId(),
      prefill: { name, email, contact: phone },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start the payment'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
