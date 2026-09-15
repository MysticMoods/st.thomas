import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  FULL_DAY,
  type HallCalendar,
  averageRating,
  bookingWindow,
  dateKey,
  isFree,
  rentOf,
  rooms,
  sessionsClash,
} from '../src/lib/hall.ts'
import type { HallContent, HallRoom } from '../src/lib/types.ts'

/**
 * Whether a hall is free on a day.
 *
 * This is the one piece of arithmetic on the site that two families can lose
 * money over. The parish lets the medium and large halls separately or together
 * as one room, so a booking of the combined room has to hold both halves and a
 * booking of either half has to block the combined room — in both directions,
 * and a full day has to clash with everything.
 */

const hall = {
  halls: [
    { id: 'small' },
    { id: 'medium' },
    { id: 'large' },
    { id: 'medium-large', combines: ['medium', 'large'] },
  ],
  sessions: [{ id: 'morning' }, { id: 'evening' }, { id: FULL_DAY }],
  booking: { minNoticeDays: 3, monthsAhead: 6 },
} as unknown as HallContent

const DAY = '2027-01-15'
const free: HallCalendar = {}
const taken = (room: string, session: string): HallCalendar => ({
  [room]: { [DAY]: { [session]: 'confirmed' } },
})

describe('which rooms a booking occupies', () => {
  test('a plain hall is itself', () => {
    assert.deepEqual(rooms(hall, 'small'), ['small'])
  })

  test('the combined hall is both of its halves', () => {
    assert.deepEqual(rooms(hall, 'medium-large'), ['medium', 'large'])
  })

  test('an id nobody recognises is treated as itself, not as everything', () => {
    assert.deepEqual(rooms(hall, 'nonsense'), ['nonsense'])
  })
})

describe('sessions clashing', () => {
  test('the same session clashes with itself', () => {
    assert.equal(sessionsClash('morning', 'morning'), true)
  })

  test('morning and evening do not clash', () => {
    assert.equal(sessionsClash('morning', 'evening'), false)
  })

  test('a full day clashes with everything, whichever side it is on', () => {
    assert.equal(sessionsClash(FULL_DAY, 'morning'), true)
    assert.equal(sessionsClash('morning', FULL_DAY), true)
    assert.equal(sessionsClash(FULL_DAY, FULL_DAY), true)
  })
})

describe('isFree', () => {
  test('an empty calendar leaves everything free', () => {
    assert.equal(isFree(hall, free, 'medium', DAY, 'morning'), true)
  })

  test('a taken session is not free', () => {
    assert.equal(isFree(hall, taken('medium', 'morning'), 'medium', DAY, 'morning'), false)
  })

  test('the other session of the same day is still free', () => {
    assert.equal(isFree(hall, taken('medium', 'morning'), 'medium', DAY, 'evening'), true)
  })

  test('another day is unaffected', () => {
    assert.equal(isFree(hall, taken('medium', 'morning'), 'medium', '2027-02-20', 'morning'), true)
  })

  test('a full day booking closes every session of that room', () => {
    const cal = taken('medium', FULL_DAY)
    assert.equal(isFree(hall, cal, 'medium', DAY, 'morning'), false)
    assert.equal(isFree(hall, cal, 'medium', DAY, 'evening'), false)
    assert.equal(isFree(hall, cal, 'medium', DAY, FULL_DAY), false)
  })

  test('half of the combined hall blocks the combined hall', () => {
    // Somebody has the medium; nobody may now take medium-and-large together.
    assert.equal(isFree(hall, taken('medium', 'morning'), 'medium-large', DAY, 'morning'), false)
    assert.equal(isFree(hall, taken('large', 'morning'), 'medium-large', DAY, 'morning'), false)
  })

  test('the combined hall blocks both of its halves', () => {
    // The reverse direction, which is the one easy to get wrong: a booking made
    // as 'medium-large' is written against medium and large, never against the
    // combined id, so each half must see it.
    const cal: HallCalendar = {
      medium: { [DAY]: { morning: 'confirmed' } },
      large: { [DAY]: { morning: 'confirmed' } },
    }
    assert.equal(isFree(hall, cal, 'medium', DAY, 'morning'), false)
    assert.equal(isFree(hall, cal, 'large', DAY, 'morning'), false)
  })

  test('the small hall is untouched by any of it', () => {
    const cal: HallCalendar = {
      medium: { [DAY]: { [FULL_DAY]: 'confirmed' } },
      large: { [DAY]: { [FULL_DAY]: 'confirmed' } },
    }
    assert.equal(isFree(hall, cal, 'small', DAY, 'morning'), true)
  })

  test('a held request blocks the slot as firmly as a confirmed one', () => {
    // A request holds the day while the family finds the advance; letting a
    // second family ask for it would be promising the same Saturday twice.
    const cal: HallCalendar = { medium: { [DAY]: { morning: 'pending' } } }
    assert.equal(isFree(hall, cal, 'medium', DAY, 'morning'), false)
  })

  test('a day the parish has blocked is not free', () => {
    const cal: HallCalendar = { medium: { [DAY]: { morning: 'blocked' } } }
    assert.equal(isFree(hall, cal, 'medium', DAY, 'morning'), false)
  })
})

describe('rent', () => {
  const room = { id: 'medium', rates: { morning: 4000, [FULL_DAY]: 7000 } } as unknown as HallRoom

  test('reads the rate for the session asked for', () => {
    assert.equal(rentOf(room, 'morning'), 4000)
    assert.equal(rentOf(room, FULL_DAY), 7000)
  })

  test('a session with no rate is zero rather than undefined', () => {
    assert.equal(rentOf(room, 'evening'), 0)
  })

  test('no room at all is zero rather than a crash', () => {
    assert.equal(rentOf(undefined, 'morning'), 0)
  })
})

describe('the booking window', () => {
  test('opens after the notice period and closes months ahead', () => {
    const now = new Date(2027, 0, 10)
    const { first, last } = bookingWindow(hall, now)
    assert.equal(first, '2027-01-13') // three days' notice
    assert.equal(last, '2027-07-10') // six months ahead
  })

  test('dates are the wall calendar, not a timestamp', () => {
    // Late evening local time must not roll over into tomorrow via UTC.
    assert.equal(dateKey(new Date(2027, 0, 15, 23, 45)), '2027-01-15')
    assert.equal(dateKey(new Date(2027, 0, 1, 0, 5)), '2027-01-01')
  })
})

describe('review average', () => {
  test('no reviews is zero, not a division by nothing', () => {
    assert.equal(averageRating([]), 0)
  })

  test('rounded to one decimal', () => {
    assert.equal(averageRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }]), 4.3)
    assert.equal(averageRating([{ rating: 5 }, { rating: 4 }]), 4.5)
  })
})
