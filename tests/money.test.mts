import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { afterEach, beforeEach, describe, test } from 'node:test'

/**
 * The signature checks that stand between the parish account and a forged
 * payment.
 *
 * CLAUDE.md puts it plainly: the signature is verified before anything is
 * believed, and the amount is read back from Razorpay rather than taken from
 * the browser. The second half is a network call and belongs in the end-to-end
 * suite; the first half is arithmetic, and arithmetic can be pinned down here
 * so that nobody relaxes it by accident.
 */

const KEY_ID = 'rzp_test_forthetests'
const KEY_SECRET = 'secret-for-the-tests-only'
const WEBHOOK_SECRET = 'webhook-secret-for-the-tests-only'

/** The signature Razorpay would send for a real payment on these keys. */
function sign(orderId: string, paymentId: string, secret = KEY_SECRET) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

let razorpay: typeof import('../src/lib/razorpay.ts')
const saved: Record<string, string | undefined> = {}

beforeEach(async () => {
  for (const key of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET']) {
    saved[key] = process.env[key]
  }
  process.env.RAZORPAY_KEY_ID = KEY_ID
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
  // The module reads the environment when it is called, not when it is loaded,
  // so one import serves every case.
  razorpay ??= await import('../src/lib/razorpay.ts')
})

afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('payment signature', () => {
  const order = 'order_ABC123'
  const payment = 'pay_XYZ789'

  test('accepts the signature Razorpay would send', () => {
    assert.equal(
      razorpay.verifyPaymentSignature({
        orderId: order,
        paymentId: payment,
        signature: sign(order, payment),
      }),
      true,
    )
  })

  test('refuses a signature made with the wrong secret', () => {
    assert.equal(
      razorpay.verifyPaymentSignature({
        orderId: order,
        paymentId: payment,
        signature: sign(order, payment, 'not-the-parish-secret'),
      }),
      false,
    )
  })

  test('refuses a signature lifted from another order', () => {
    // The whole attack: pay ₹1 for one order, reuse that signature on another.
    assert.equal(
      razorpay.verifyPaymentSignature({
        orderId: 'order_SOMEONE_ELSE',
        paymentId: payment,
        signature: sign(order, payment),
      }),
      false,
    )
  })

  test('refuses a signature lifted from another payment', () => {
    assert.equal(
      razorpay.verifyPaymentSignature({
        orderId: order,
        paymentId: 'pay_SOMEONE_ELSE',
        signature: sign(order, payment),
      }),
      false,
    )
  })

  test('refuses an empty signature', () => {
    assert.equal(
      razorpay.verifyPaymentSignature({ orderId: order, paymentId: payment, signature: '' }),
      false,
    )
  })

  test('refuses a signature of the wrong length rather than throwing', () => {
    // timingSafeEqual throws on mismatched lengths; safeEqual must not.
    assert.equal(
      razorpay.verifyPaymentSignature({ orderId: order, paymentId: payment, signature: 'abc' }),
      false,
    )
  })

  test('refuses everything while the keys are unset', () => {
    delete process.env.RAZORPAY_KEY_SECRET
    assert.equal(razorpay.isConfigured(), false)

    // Signed with the empty secret the module would fall back to. Without the
    // `isConfigured` guard this signature would verify perfectly — which is the
    // whole danger: a site whose keys have not been set, or have been lost from
    // the environment on a restart, would start accepting payments that anybody
    // can forge, because the key everybody would be signing with is ''.
    const forged = sign(order, payment, '')
    assert.equal(
      razorpay.verifyPaymentSignature({ orderId: order, paymentId: payment, signature: forged }),
      false,
    )

    // And a signature made with the real secret is refused too.
    assert.equal(
      razorpay.verifyPaymentSignature({
        orderId: order,
        paymentId: payment,
        signature: sign(order, payment),
      }),
      false,
    )
  })
})

describe('webhook signature', () => {
  const body = '{"event":"payment.captured","payload":{}}'
  const good = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')

  test('accepts a body signed with the webhook secret', () => {
    assert.equal(razorpay.verifyWebhookSignature(body, good), true)
  })

  test('refuses a body that has been altered after signing', () => {
    assert.equal(
      razorpay.verifyWebhookSignature('{"event":"payment.captured","payload":{"x":1}}', good),
      false,
    )
  })

  test('refuses the payment secret used in place of the webhook secret', () => {
    const wrong = crypto.createHmac('sha256', KEY_SECRET).update(body).digest('hex')
    assert.equal(razorpay.verifyWebhookSignature(body, wrong), false)
  })

  test('refuses an empty signature', () => {
    assert.equal(razorpay.verifyWebhookSignature(body, ''), false)
  })

  test('refuses everything while the webhook secret is unset', () => {
    delete process.env.RAZORPAY_WEBHOOK_SECRET
    assert.equal(razorpay.verifyWebhookSignature(body, good), false)
  })
})
