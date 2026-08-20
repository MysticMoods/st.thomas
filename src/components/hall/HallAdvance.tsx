'use client'

import { useState } from 'react'

import { useLang } from '@/lib/i18n'
import { formatNumber } from '@/lib/utils'

import { Icon } from '../ui/Icon'

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

type CheckoutResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

function loadCheckout() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Could not reach Razorpay')), {
      once: true,
    })
    if (!existing) {
      script.src = CHECKOUT_SCRIPT
      script.async = true
      document.body.appendChild(script)
    }
  })
}

/**
 * Paying the hall advance from the confirmation card.
 *
 * A request holds a day for seven days and becomes a booking only when the
 * advance arrives. Until now that meant a trip to the office, so half the
 * calendar sat in "held" waiting for somebody's Saturday. Nothing here is
 * trusted: the server checks the signature with Razorpay and reads the amount
 * back before it confirms anything.
 */
export function HallAdvance({
  bookingId,
  advance,
  phone,
}: {
  bookingId: string
  advance: number
  phone: string
}) {
  const { t, lang } = useLang()
  const [status, setStatus] = useState<'idle' | 'starting' | 'verifying' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function pay() {
    setStatus('starting')
    setError('')
    try {
      const res = await fetch('/api/hall/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId }),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error ?? 'Could not start the payment')

      await loadCheckout()
      if (!window.Razorpay) throw new Error('Could not reach Razorpay')

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'St. Thomas Church, Mangalassery',
        description: `Hall advance · ${bookingId}`,
        prefill: { name: order.booking?.name, email: order.booking?.email },
        theme: { color: '#C9A227' },
        handler: async (response: CheckoutResponse) => {
          setStatus('verifying')
          try {
            const confirm = await fetch('/api/hall/advance', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            })
            const json = await confirm.json()
            if (!confirm.ok) throw new Error(json.error ?? 'The payment could not be confirmed')
            setStatus('done')
          } catch (e) {
            setError(e instanceof Error ? e.message : 'The payment could not be confirmed')
            setStatus('error')
          }
        },
        modal: { ondismiss: () => setStatus('idle') },
      })
      checkout.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <p className="mt-4 border-t border-gold-400/30 pt-4 font-sans text-sm text-[rgb(var(--ink))]">
        {t({
          en: 'The advance has been received and your booking is confirmed. A confirmation has gone to your email address.',
          ml: 'അഡ്വാൻസ് ലഭിച്ചു, നിങ്ങളുടെ ബുക്കിംഗ് ഉറപ്പിച്ചു. സ്ഥിരീകരണം നിങ്ങളുടെ ഇമെയിലിലേക്ക് അയച്ചിട്ടുണ്ട്.',
        })}
      </p>
    )
  }

  return (
    <div className="mt-4 border-t border-gold-400/30 pt-4">
      <p className="font-sans text-sm text-[rgb(var(--ink))]">
        {t({ en: 'Confirm it now with the advance', ml: 'അഡ്വാൻസ് നൽകി ഇപ്പോൾ ഉറപ്പിക്കുക' })} — ₹
        {formatNumber(advance, lang)}
      </p>
      <p className="mt-1 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
        {t({
          en: 'This takes the day off the calendar straight away. You may also pay at the parish office within seven days.',
          ml: 'ഇത് ഉടൻ തന്നെ ആ ദിവസം കലണ്ടറിൽ നിന്ന് മാറ്റും. ഏഴ് ദിവസത്തിനുള്ളിൽ ഇടവക ഓഫീസിലും അടയ്ക്കാം.',
        })}
      </p>

      <button
        type="button"
        onClick={pay}
        disabled={status === 'starting' || status === 'verifying'}
        className="btn-primary mt-4"
      >
        {status === 'starting'
          ? t({ en: 'Opening…', ml: 'തുറക്കുന്നു…' })
          : status === 'verifying'
            ? t({ en: 'Confirming…', ml: 'ഉറപ്പിക്കുന്നു…' })
            : t({ en: 'Pay the advance', ml: 'അഡ്വാൻസ് അടയ്ക്കുക' })}
        <Icon name="arrowRight" className="h-4 w-4" />
      </button>

      {status === 'error' && error ? (
        <p className="mt-3 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
          {error} · {phone}
        </p>
      ) : null}
    </div>
  )
}
