import { readRecords } from './content'
import type { HallBooking, HallCalendar } from './hall'
import { FULL_DAY, isLive, rooms } from './hall'
import type { HallContent } from './types'

/**
 * Availability per room, keyed by date. Held and confirmed days are both shown
 * as taken — a visitor should not send a second request for a session the
 * office is already deciding on — but they are drawn differently.
 *
 * A booking of the combined room marks both halves, which is what stops the
 * medium hall being let separately on a day the whole place is spoken for.
 */
export async function readCalendar(hall: HallContent): Promise<HallCalendar> {
  const bookings = (await readRecords('hall-bookings')) as HallBooking[]
  const calendar: HallCalendar = {}

  const mark = (room: string, date: string, session: string, state: 'confirmed' | 'pending' | 'blocked') => {
    const days = (calendar[room] ??= {})
    const day = (days[date] ??= {})
    // A parish block outranks anything a visitor asked for, and a confirmed
    // booking outranks one that is still being decided.
    if (day[session] === 'blocked') return
    if (day[session] === 'confirmed' && state !== 'blocked') return
    day[session] = state
  }

  // Days the parish keeps for itself close every room.
  for (const day of hall.blocked) {
    for (const room of hall.halls) {
      if (room.combines?.length) continue
      mark(room.id, day.date, FULL_DAY, 'blocked')
    }
  }

  for (const booking of bookings) {
    if (!isLive(booking)) continue
    const state = booking.status === 'confirmed' ? 'confirmed' : 'pending'
    for (const room of rooms(hall, booking.hall)) {
      mark(room, booking.date, booking.session, state)
    }
  }

  return calendar
}
