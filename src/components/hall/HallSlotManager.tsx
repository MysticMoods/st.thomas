'use client'

import { useCallback, useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { Modal, useDialogId } from '@/components/ui/Modal'
import type { HallBooking } from '@/lib/hall'
import { rooms, sessionsClash } from '@/lib/hall'
import type { HallContent } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * What staff see when they click a day in the calendar: whoever already has it,
 * and a short form to write in a booking taken at the counter.
 *
 * This is the offline half of the hall diary — somebody walks into the parish
 * office, the day is written here, and the public calendar closes that session.
 */
export function HallSlotManager({
  hall,
  room,
  date,
  session,
  onClose,
  onChanged,
}: {
  hall: HallContent
  room: string
  date: string
  session: string
  onClose: () => void
  onChanged: () => void
}) {
  const titleId = useDialogId('hall-slot')
  const [bookings, setBookings] = useState<HallBooking[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', purpose: '', guests: '' })

  const roomName = hall.halls.find((entry) => entry.id === room)?.name
  const sessionName = hall.sessions.find((entry) => entry.id === session)?.label
  const held = rooms(hall, room)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/hall', { cache: 'no-store' })
      const json = await res.json()
      const all: HallBooking[] = Array.isArray(json.bookings) ? json.bookings : []
      setBookings(
        all.filter(
          (booking) =>
            booking.date === date &&
            booking.status !== 'declined' &&
            sessionsClash(booking.session, session) &&
            rooms(hall, booking.hall).some((id) => held.includes(id)),
        ),
      )
    } catch {
      setBookings([])
    }
  }, [date, hall, held, session])

  useEffect(() => {
    load()
  }, [load])

  async function book() {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/hall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hall: room,
          date,
          session,
          name: form.name,
          phone: form.phone,
          purpose: form.purpose,
          guests: Number(form.guests) || 0,
          message: 'Booked at the parish office.',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not write the booking')
      setForm({ name: '', phone: '', purpose: '', guests: '' })
      await load()
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not write the booking')
    } finally {
      setBusy(false)
    }
  }

  async function free(booking: HallBooking) {
    if (!window.confirm(`Free this slot? The booking from ${booking.name} will be removed.`)) return
    setBusy(true)
    try {
      await fetch('/api/admin/hall', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id }),
      })
      await load()
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function decide(booking: HallBooking, status: HallBooking['status']) {
    setBusy(true)
    try {
      await fetch('/api/admin/hall', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, status }),
      })
      await load()
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  const taken = (bookings ?? []).length > 0

  return (
    <Modal open onClose={onClose} labelledBy={titleId} className="max-w-2xl">
      <div className="p-6 sm:p-8">
        <p className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
          Parish office · hall diary
        </p>
        <h2 id={titleId} className="mt-2 font-display text-2xl text-[rgb(var(--ink))]">
          {new Date(date).toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </h2>
        <p className="mt-1 font-sans text-sm text-[rgb(var(--muted))]">
          {roomName?.en} · {sessionName?.en}
        </p>

        {bookings === null ? (
          <div className="mt-6 skeleton h-24 rounded-sm" />
        ) : taken ? (
          <ul className="mt-6 flex flex-col gap-3">
            {bookings.map((booking) => (
              <li key={booking.id} className="rounded-sm border border-[rgb(var(--line))] p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-sans text-sm text-[rgb(var(--ink))]">
                    {booking.name}
                    {booking.purpose ? ` · ${booking.purpose}` : ''}
                  </span>
                  <span
                    className={cn(
                      'rounded-full border px-3 py-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em]',
                      booking.status === 'confirmed'
                        ? 'border-gold-400 text-gold-700 dark:text-gold-300'
                        : 'border-[rgb(var(--line))] text-[rgb(var(--muted))]',
                    )}
                  >
                    {booking.status}
                  </span>
                </div>
                <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
                  {hall.halls.find((entry) => entry.id === booking.hall)?.name.en ?? booking.hall} ·{' '}
                  {booking.session}
                  {booking.phone ? ` · ${booking.phone}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {booking.status !== 'confirmed' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => decide(booking, 'confirmed')}
                      className="rounded-sm bg-gold-400 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 hover:bg-gold-300 disabled:opacity-60"
                    >
                      Confirm
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => free(booking)}
                    className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500 disabled:opacity-60"
                  >
                    Free this slot
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <p className="font-sans text-sm text-[rgb(var(--muted))]">
              Nothing booked. Write in a booking taken at the office — it is confirmed straight
              away and closes the day for everyone else.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Who it is for
                </span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Family or group"
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Phone
                </span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  Occasion
                </span>
                <input
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  className="field"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                  People expected
                </span>
                <input
                  type="number"
                  min={0}
                  value={form.guests}
                  onChange={(e) => setForm({ ...form, guests: e.target.value })}
                  className="field tabular-nums"
                />
              </label>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={book}
              className="btn-primary mt-5 w-full"
            >
              {busy ? 'Writing it in…' : 'Book this slot'}
              <Icon name="check" className="h-4 w-4" />
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-4 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-sm border border-[rgb(var(--line))] py-2.5 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}
