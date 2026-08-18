import crypto from 'crypto'

/**
 * Razorpay, spoken to over its REST API rather than through the SDK — the
 * parish site needs exactly two calls (create an order, verify a signature),
 * and neither is worth a dependency that has to be kept updated by a volunteer.
 *
 * Nothing here ever touches a card number: the visitor types those into
 * Razorpay's own hosted checkout, and this server only ever sees ids.
 */

export const RAZORPAY_CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'
const API = 'https://api.razorpay.com/v1'

export function keyId() {
  return process.env.RAZORPAY_KEY_ID?.trim() ?? ''
}

function keySecret() {
  return process.env.RAZORPAY_KEY_SECRET?.trim() ?? ''
}

/** True once both halves of the key pair are present in the environment. */
export function isConfigured() {
  return Boolean(keyId() && keySecret())
}

function authHeader() {
  return `Basic ${Buffer.from(`${keyId()}:${keySecret()}`).toString('base64')}`
}

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  status: string
}

/**
 * Creates an order. `amount` is in paise — Razorpay deals only in the smallest
 * unit, and rounding it anywhere else invites a rupee to go missing.
 */
export async function createOrder(input: {
  amount: number
  receipt: string
  notes: Record<string, string>
}): Promise<RazorpayOrder> {
  const response = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: 'INR',
      receipt: input.receipt,
      notes: input.notes,
      payment_capture: 1,
    }),
    cache: 'no-store',
  })

  const json = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    const error = json.error as { description?: string } | undefined
    throw new Error(error?.description ?? 'Razorpay refused the order')
  }
  return json as unknown as RazorpayOrder
}

/** Constant-time comparison of two hex digests of equal expected length. */
function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * The signature Razorpay returns to the browser after a successful payment.
 * Until this passes, a payment is only claimed — never recorded as received.
 */
export function verifyPaymentSignature(input: {
  orderId: string
  paymentId: string
  signature: string
}) {
  if (!isConfigured()) return false
  const expected = crypto
    .createHmac('sha256', keySecret())
    .update(`${input.orderId}|${input.paymentId}`)
    .digest('hex')
  return safeEqual(expected, input.signature)
}

/** The separate secret used for the webhook, set in the Razorpay dashboard. */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim()
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return safeEqual(expected, signature)
}

/** Reads one payment back from Razorpay, so the amount is never taken on trust. */
export async function fetchPayment(paymentId: string) {
  const response = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('Could not read the payment back from Razorpay')
  return (await response.json()) as {
    id: string
    amount: number
    currency: string
    status: string
    method?: string
    order_id?: string
    email?: string
    contact?: string
    notes?: Record<string, string>
  }
}
