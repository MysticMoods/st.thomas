'use client'

import { useCallback, useEffect, useState } from 'react'

import type { Reply } from '@/lib/reply'
import { cn } from '@/lib/utils'

import { ReplyBox } from './ops/ReplyBox'

type Booking = {
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
  replies?: Reply[]
}

/**
 * Requests sent from the hall page. Confirming one takes the day off the public
 * calendar; declining puts it back.
 */
export function HallBookings() {
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [busy, setBusy] = useState('')
  const [filter, setFilter] = useState<'pending' | 'confirmed' | 'declined' | 'all'>('pending')
  const [halls, setHalls] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/hall', { cache: 'no-store' })
      const json = await res.json()
      setBookings(Array.isArray(json.bookings) ? json.bookings : [])
    } catch {
      setBookings([])
    }
  }, [])

  useEffect(() => {
    load()
    // Names for the hall ids, so the list reads "Large Hall", not "large".
    fetch('/api/admin/content/hall', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        const rooms = json?.data?.halls
        if (!Array.isArray(rooms)) return
        setHalls(Object.fromEntries(rooms.map((room) => [room.id, room.name?.en ?? room.id])))
      })
      .catch(() => {})
  }, [load])

  async function decide(id: string, status: Booking['status']) {
    setBusy(id)
    try {
      await fetch('/api/admin/hall', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      await load()
    } finally {
      setBusy('')
    }
  }

  if (!bookings) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-sm" />
        ))}
      </div>
    )
  }

  const counts = {
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    declined: bookings.filter((b) => b.status === 'declined').length,
    all: bookings.length,
  }
  const shown = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter)

  return (
    <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(var(--line))] px-6 py-5">
        <div>
          <h1 className="font-display text-2xl text-[rgb(var(--ink))]">Hall Bookings</h1>
          <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
            Confirming a request is what blocks the day on the public calendar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['pending', 'confirmed', 'declined', 'all'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                'rounded-sm border px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] transition-colors',
                filter === key
                  ? 'border-gold-400 bg-gold-400/10 text-gold-700 dark:text-gold-300'
                  : 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-400',
              )}
            >
              {key} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="px-6 py-10 font-sans text-sm text-[rgb(var(--muted))]">
          Nothing here yet. Requests sent from the hall page arrive in this list.
        </p>
      ) : (
        <ul className="divide-y divide-[rgb(var(--line))]">
          {shown.map((booking) => (
            <li key={booking.id} className="px-6 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="font-serif text-lg text-[rgb(var(--ink))]">
                  {new Date(booking.date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  <span className="ml-3 font-sans text-2xs uppercase tracking-[0.16em] text-gold-600 dark:text-gold-400">
                    {halls[booking.hall] ?? booking.hall} · {booking.session}
                  </span>
                </span>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em]',
                    booking.status === 'confirmed' && 'border-gold-400 text-gold-700 dark:text-gold-300',
                    booking.status === 'pending' && 'border-[rgb(var(--line))] text-[rgb(var(--muted))]',
                    booking.status === 'declined' &&
                      'border-burgundy-400/60 text-burgundy-600 dark:text-burgundy-300',
                  )}
                >
                  {booking.status}
                </span>
              </div>

              <p className="mt-2 font-sans text-sm text-[rgb(var(--ink))]">
                {booking.name}
                {booking.purpose ? ` · ${booking.purpose}` : ''}
                {booking.guests ? ` · ${booking.guests} people` : ''}
              </p>
              <p className="mt-1 font-sans text-2xs text-gold-600 dark:text-gold-400">
                {booking.phone} · {booking.email}
              </p>

              {booking.amenities.length > 0 ? (
                <p className="mt-2 flex flex-wrap gap-2">
                  {booking.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="rounded-sm border border-[rgb(var(--line))] px-2.5 py-1 font-sans text-[0.6rem] uppercase tracking-[0.12em] text-[rgb(var(--muted))]"
                    >
                      {amenity}
                    </span>
                  ))}
                </p>
              ) : null}

              {booking.message ? (
                <p className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                  {booking.message}
                </p>
              ) : null}

              <ReplyBox
                list="hall-bookings"
                target={{ ...booking, subject: `hall booking ${booking.date}` }}
                onDone={load}
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {booking.status !== 'confirmed' ? (
                  <button
                    type="button"
                    disabled={busy === booking.id}
                    onClick={() => decide(booking.id, 'confirmed')}
                    className="rounded-sm bg-gold-400 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 transition-colors hover:bg-gold-300 disabled:opacity-60"
                  >
                    Confirm
                  </button>
                ) : null}
                {booking.status !== 'declined' ? (
                  <button
                    type="button"
                    disabled={busy === booking.id}
                    onClick={() => decide(booking.id, 'declined')}
                    className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500 disabled:opacity-60"
                  >
                    Decline
                  </button>
                ) : null}
                {booking.status !== 'pending' ? (
                  <button
                    type="button"
                    disabled={busy === booking.id}
                    onClick={() => decide(booking.id, 'pending')}
                    className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:text-gold-500 disabled:opacity-60"
                  >
                    Put back to pending
                  </button>
                ) : null}
                <span className="ml-auto font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                  asked {new Date(booking.at).toLocaleDateString('en-IN')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
