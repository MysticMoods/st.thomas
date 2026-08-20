import type { HallContent, HallRoom } from './types'

/**
 * One request for a parish hall. Written by the public form, decided in the
 * dashboard. Nothing is charged online: `confirmed` means the office has taken
 * the advance and that room is now spoken for.
 */
export type HallBooking = {
  id: string
  hall: string
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

/**
 * A word from someone who used a hall. Written by the public form, shown only
 * once the parish office has published it — the page is the parish's, not an
 * open comment box.
 */
export type HallReview = {
  id: string
  hall: string
  rating: number
  name: string
  occasion: string
  message: string
  status: 'pending' | 'published' | 'hidden'
  at: string
  decidedAt?: string
}

/** Average of the published reviews, to one decimal. */
export function averageRating(reviews: { rating: number }[]) {
  if (reviews.length === 0) return 0
  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  return Math.round((total / reviews.length) * 10) / 10
}

/** What a visitor may know: which sessions of which room are taken. */
export type DayState = Record<string, 'confirmed' | 'pending' | 'blocked'>
/** room id -> date -> session -> state */
export type HallCalendar = Record<string, Record<string, DayState>>

export const FULL_DAY = 'full-day'

/**
 * The physical rooms a booking occupies. Taking the two halls together holds
 * both of them, so neither can be let separately that session — and a booking
 * of either one blocks the combined room.
 */
export function rooms(hall: HallContent, id: string): string[] {
  const room = hall.halls.find((entry) => entry.id === id)
  return room?.combines?.length ? room.combines : [id]
}

/** A full day booking covers every session, in both directions. */
export function sessionsClash(a: string, b: string) {
  return a === b || a === FULL_DAY || b === FULL_DAY
}

export function isLive(booking: HallBooking) {
  return booking.status === 'pending' || booking.status === 'confirmed'
}

/** True when this room can still be asked for on that date and session. */
export function isFree(
  hall: HallContent,
  calendar: HallCalendar,
  id: string,
  date: string,
  session: string,
) {
  return rooms(hall, id).every((room) => {
    const day = calendar[room]?.[date]
    if (!day) return true
    return !Object.entries(day).some(([taken]) => sessionsClash(taken, session))
  })
}

/** How a day should be drawn for one room: free, held, taken or parish use. */
export function dayTone(
  hall: HallContent,
  calendar: HallCalendar,
  id: string,
  date: string,
  session: string,
): 'free' | 'held' | 'taken' | 'blocked' {
  let tone: 'free' | 'held' | 'taken' | 'blocked' = 'free'
  for (const room of rooms(hall, id)) {
    const day = calendar[room]?.[date]
    if (!day) continue
    for (const [taken, status] of Object.entries(day)) {
      if (!sessionsClash(taken, session)) continue
      if (status === 'blocked') return 'blocked'
      if (status === 'confirmed') tone = 'taken'
      else if (tone === 'free') tone = 'held'
    }
  }
  return tone
}

/** The rent for one room and session, ignoring amenities. */
export function rentOf(room: HallRoom | undefined, session: string) {
  return room?.rates?.[session] ?? 0
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
