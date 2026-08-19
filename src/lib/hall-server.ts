import { readRecords } from './content'
import type { HallBooking } from './hall'
import { FULL_DAY, isLive } from './hall'
import type { DayState } from './hall'
import type { HallContent } from './types'

/**
 * Availability for the calendar, keyed by date. Held and confirmed days are
 * both shown as taken — a visitor should not send a second request for a day
 * the office is already deciding on — but they are drawn differently.
 */
export async function readCalendar(hall: HallContent): Promise<Record<string, DayState>> {
  const bookings = (await readRecords('hall-bookings')) as HallBooking[]
  const calendar: Record<string, DayState> = {}

  for (const day of hall.blocked) {
    calendar[day.date] = { [FULL_DAY]: 'blocked' }
  }

  for (const booking of bookings) {
    if (!isLive(booking)) continue
    const day = (calendar[booking.date] ??= {})
    // A parish block outranks anything a visitor asked for.
    if (day[FULL_DAY] === 'blocked') continue
    const current = day[booking.session]
    if (current === 'confirmed') continue
    // isLive() has already ruled out 'declined', but say so for the compiler.
    day[booking.session] = booking.status === 'confirmed' ? 'confirmed' : 'pending'
  }

  return calendar
}
