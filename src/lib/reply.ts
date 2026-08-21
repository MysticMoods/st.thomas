/**
 * Answering somebody from the dashboard.
 *
 * A message arrives, the office reads it in the dashboard, and until now had to
 * open a mail programme, copy the address across and type the answer out there
 * — where nobody else in the parish can see that it was answered. This lets the
 * reply be written where the message is read, and keeps it beside the message
 * afterwards, so the next person to look knows it has been dealt with and by
 * whom.
 *
 * Two ways out. Email goes through the same outbox as every other letter. The
 * WhatsApp button opens WhatsApp with the answer already typed, and the parish
 * sends it from its own number — no business account, no approved templates,
 * nothing to pay for, and the family gets a message from a number they can
 * reply to.
 */

export type ReplyChannel = 'email' | 'whatsapp'

export type Reply = {
  text: string
  /** Which account wrote it. */
  by: string
  at: string
  channel: ReplyChannel
  /** `handed-over` is a WhatsApp reply: opened, and out of our hands after that. */
  status: 'sent' | 'failed' | 'not-configured' | 'handed-over'
  error?: string
}

/** The shape every answerable record shares. */
export type Answerable = {
  id?: string
  name: string
  email?: string
  phone?: string
  at: string
  replies?: Reply[]
}

export const MAX_REPLY = 4000

/**
 * Which record a reply belongs to.
 *
 * Messages written before the form gave them an id are identified by the moment
 * they arrived instead: two messages do not arrive in the same millisecond, and
 * giving the old ones ids now would mean rewriting a file the office is reading.
 */
export function recordKey(record: { id?: string; at: string }) {
  return record.id || record.at
}

/**
 * A telephone number as WhatsApp wants it: digits, with the country code and
 * nothing else. A parish form collects them written a dozen ways — 98470 12345,
 * +91 98470 12345, 098470 12345 — and every one of them means the same ten
 * digits. Anything that cannot be made sense of returns empty, and the button
 * is not offered rather than opening WhatsApp on a wrong number.
 */
export function whatsappNumber(raw: string, countryCode = '91') {
  const digits = (raw || '').replace(/[^0-9]/g, '')
  if (!digits) return ''
  if (digits.length === 10) return countryCode + digits
  if (digits.length === 11 && digits.startsWith('0')) return countryCode + digits.slice(1)
  // Already carries a country code.
  if (digits.length >= 11 && digits.length <= 15) return digits
  return ''
}

/** The link that opens WhatsApp with the answer already written out. */
export function whatsappLink(phone: string, text: string) {
  const number = whatsappNumber(phone)
  if (!number) return ''
  return `https://wa.me/${number}?text=${encodeURIComponent(text.slice(0, MAX_REPLY))}`
}
