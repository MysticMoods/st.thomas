import { readContent } from '@/lib/content'
import type { EventsContent, MassContent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The parish week, as a calendar anyone can subscribe to.
 *
 * Mass timings and the weekly events were readable on the site and nowhere
 * else — you could look them up but not be reminded of them. This turns both
 * into a feed a phone can follow, so a change made in the dashboard reaches
 * every phone that subscribed without anybody being told to look again.
 *
 * Deliberately a live feed rather than a one-off download: the point is that it
 * keeps up.
 */

const DAYS: Record<string, string> = {
  sun: 'SU',
  mon: 'MO',
  tue: 'TU',
  wed: 'WE',
  thu: 'TH',
  fri: 'FR',
  sat: 'SA',
}

/** Which days a group of mass timings falls on. */
const GROUP_DAYS: Record<string, string[]> = {
  sunday: ['SU'],
  weekdays: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA'],
  confession: ['SA'],
  adoration: ['FR'],
}

/** "6:15 AM" -> minutes past midnight, or null when it is not a time at all. */
function minutesOf(value: string) {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim())
  if (!match) return null
  let hour = Number(match[1]) % 12
  if (match[3].toUpperCase() === 'PM') hour += 12
  return hour * 60 + Number(match[2])
}

function stamp(date: Date) {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/**
 * A local wall-clock time written as a floating value — no Z, no offset. A
 * calendar shows it at that time wherever the reader is, which is what a parish
 * timetable means: half past six is half past six.
 */
function local(date: Date, minutes: number) {
  const at = new Date(date)
  at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  const pad = (n: number) => `${n}`.padStart(2, '0')
  return `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}T${pad(at.getHours())}${pad(at.getMinutes())}00`
}

/** Long lines must be folded at 75 octets, and commas and semicolons escaped. */
function fold(line: string) {
  const clean = line.replace(/\r?\n/g, '\\n')
  if (clean.length <= 74) return clean
  const parts = [clean.slice(0, 74)]
  let rest = clean.slice(74)
  while (rest.length > 73) {
    parts.push(` ${rest.slice(0, 73)}`)
    rest = rest.slice(73)
  }
  if (rest) parts.push(` ${rest}`)
  return parts.join('\r\n')
}

function escape(value: string) {
  return value.replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n')
}

/** The first date on or after today that falls on one of these weekdays. */
function firstFalling(days: string[]) {
  const wanted = new Set(days)
  const codes = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
  const cursor = new Date()
  for (let i = 0; i < 7; i += 1) {
    if (wanted.has(codes[cursor.getDay()])) return cursor
    cursor.setDate(cursor.getDate() + 1)
  }
  return cursor
}

export async function GET() {
  const [mass, events] = await Promise.all([
    readContent<MassContent>('mass'),
    readContent<EventsContent>('events'),
  ])

  const now = new Date()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//St. Thomas Church Mangalassery//Parish calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:St. Thomas Church, Mangalassery',
    'X-WR-CALDESC:Mass timings and the parish week',
    // How often a subscribed calendar should come back and look.
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ]

  const push = (uid: string, days: string[], minutes: number, title: string, place: string) => {
    const start = firstFalling(days)
    lines.push(
      'BEGIN:VEVENT',
      fold(`UID:${uid}@stthomasmangalassery`),
      `DTSTAMP:${stamp(now)}`,
      `DTSTART:${local(start, minutes)}`,
      // Every entry here is a service, not an all-day affair; an hour is a fair
      // guess and calendars show it sensibly.
      `DTEND:${local(start, minutes + 60)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${days.join(',')}`,
      fold(`SUMMARY:${escape(title)}`),
      place ? fold(`LOCATION:${escape(place)}`) : '',
      'END:VEVENT',
    )
  }

  // the mass timetable
  for (const group of mass.groups) {
    const days = GROUP_DAYS[group.id]
    if (!days) continue
    group.entries.forEach((entry, i) => {
      const minutes = minutesOf(entry.time)
      if (minutes === null) return
      const title = `${entry.label.en}${group.id === 'sunday' ? '' : ` · ${group.title.en}`}`
      push(`mass-${group.id}-${i}`, days, minutes, title, 'St. Thomas Church, Mangalassery')
    })
  }

  // and the parish week
  for (const day of events.days) {
    const code = DAYS[day.key]
    if (!code) continue
    day.events.forEach((entry, i) => {
      const minutes = minutesOf(entry.time)
      if (minutes === null) return
      push(`event-${day.key}-${i}`, [code], minutes, entry.title.en, entry.place.en)
    })
  }

  lines.push('END:VCALENDAR')

  return new Response(`${lines.filter(Boolean).join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="st-thomas-mangalassery.ics"',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
