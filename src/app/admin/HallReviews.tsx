'use client'

import { useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

type Review = {
  id: string
  hall: string
  rating: number
  name: string
  occasion: string
  message: string
  status: 'pending' | 'published' | 'hidden'
  at: string
}

/**
 * Reviews sent from the hall page. Nothing a visitor writes reaches the public
 * page until it is published here.
 */
export function HallReviews() {
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [halls, setHalls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')
  const [filter, setFilter] = useState<'pending' | 'published' | 'hidden' | 'all'>('pending')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/hall-reviews', { cache: 'no-store' })
      const json = await res.json()
      setReviews(Array.isArray(json.reviews) ? json.reviews : [])
    } catch {
      setReviews([])
    }
  }, [])

  useEffect(() => {
    load()
    fetch('/api/admin/content/hall', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        const rooms = json?.data?.halls
        if (!Array.isArray(rooms)) return
        setHalls(Object.fromEntries(rooms.map((room) => [room.id, room.name?.en ?? room.id])))
      })
      .catch(() => {})
  }, [load])

  async function decide(id: string, status: Review['status']) {
    setBusy(id)
    try {
      await fetch('/api/admin/hall-reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      await load()
    } finally {
      setBusy('')
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete the review from ${name}? This cannot be undone.`)) return
    setBusy(id)
    try {
      await fetch('/api/admin/hall-reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await load()
    } finally {
      setBusy('')
    }
  }

  if (!reviews) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-32 rounded-sm" />
        ))}
      </div>
    )
  }

  const counts = {
    pending: reviews.filter((r) => r.status === 'pending').length,
    published: reviews.filter((r) => r.status === 'published').length,
    hidden: reviews.filter((r) => r.status === 'hidden').length,
    all: reviews.length,
  }
  const shown = filter === 'all' ? reviews : reviews.filter((r) => r.status === filter)

  return (
    <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(var(--line))] px-6 py-5">
        <div>
          <h1 className="font-display text-2xl text-[rgb(var(--ink))]">Hall Reviews</h1>
          <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
            A review appears on the hall page only once you publish it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(['pending', 'published', 'hidden', 'all'] as const).map((key) => (
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
          Nothing here yet. Reviews written on the hall page arrive in this list.
        </p>
      ) : (
        <ul className="divide-y divide-[rgb(var(--line))]">
          {shown.map((review) => (
            <li key={review.id} className="px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-sans text-sm tabular-nums text-gold-600 dark:text-gold-400">
                  {'★'.repeat(review.rating)}
                  <span className="text-[rgb(var(--muted))]">{'★'.repeat(5 - review.rating)}</span>
                  <span className="ml-3 font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                    {halls[review.hall] ?? review.hall}
                  </span>
                </span>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em]',
                    review.status === 'published' && 'border-gold-400 text-gold-700 dark:text-gold-300',
                    review.status === 'pending' && 'border-[rgb(var(--line))] text-[rgb(var(--muted))]',
                    review.status === 'hidden' &&
                      'border-burgundy-400/60 text-burgundy-600 dark:text-burgundy-300',
                  )}
                >
                  {review.status}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap font-serif text-lg italic leading-relaxed text-[rgb(var(--ink))]">
                “{review.message}”
              </p>
              <p className="mt-2 font-sans text-sm text-[rgb(var(--ink))]">
                {review.name}
                {review.occasion ? ` · ${review.occasion}` : ''}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {review.status !== 'published' ? (
                  <button
                    type="button"
                    disabled={busy === review.id}
                    onClick={() => decide(review.id, 'published')}
                    className="rounded-sm bg-gold-400 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 transition-colors hover:bg-gold-300 disabled:opacity-60"
                  >
                    Publish
                  </button>
                ) : null}
                {review.status !== 'hidden' ? (
                  <button
                    type="button"
                    disabled={busy === review.id}
                    onClick={() => decide(review.id, 'hidden')}
                    className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 disabled:opacity-60"
                  >
                    {review.status === 'published' ? 'Take down' : 'Hide'}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={busy === review.id}
                  onClick={() => remove(review.id, review.name)}
                  className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500 disabled:opacity-60"
                >
                  Delete
                </button>
                <span className="ml-auto font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                  {new Date(review.at).toLocaleDateString('en-IN')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
