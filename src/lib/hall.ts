import type { HallContent } from './types'

/**
 * One request for the parish hall. Written by the public form, decided in the
 * dashboard. Nothing is charged online: `confirmed` means the office has taken
 * the advance and the day is now spoken for.
 */
export type HallBooking = {
  id: string
  date: string
  session: string
  status: 'pending' | 'confirmed' | 'declined'
  name: string
  phone: string
  email: string
  purpose: string
  guests: number
  amenities: string[]
  message: string
  at: string
  decidedAt?: string
}

/** What a visitor is allowed to know: which sessions are taken, and how. */
export type DayState = Record<string, 'confirmed' | 'pending' | 'blocked'>

export const FULL_DAY = 'full-day'

/** A booking of the whole day occupies every session, and the reverse. */
export function clashes(a: string, b: string) {
  return a === b || a === FULL_DAY || b === FULL_DAY
}

export function isLive(booking: HallBooking) {
  return booking.status === 'pending' || booking.status === 'confirmed'
}

/** True when the session can still be asked for on that date. */
export function isFree(state: DayState | undefined, session: string) {
  if (!state) return true
  return !Object.entries(state).some(([taken]) => clashes(taken, session))
}

/** The window the calendar covers: not before the notice period, not too far ahead. */
export function bookingWindow(hall: HallContent, now = new Date()) {
  const first = new Date(now)
  first.setDate(first.getDate() + Math.max(0, hall.booking.minNoticeDays))
  const last = new Date(now)
  last.setMonth(last.getMonth() + Math.max(1, hall.booking.monthsAhead))
  return { first: dateKey(first), last: dateKey(last) }
}

/** YYYY-MM-DD in local time — the calendar is a wall calendar, not a timestamp. */
export function dateKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
