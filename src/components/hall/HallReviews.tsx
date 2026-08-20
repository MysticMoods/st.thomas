'use client'

import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'

import { averageRating } from '@/lib/hall'
import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { cn, formatDate, formatNumber } from '@/lib/utils'

import { Icon } from '../ui/Icon'
import { Reveal, StaggerGroup, staggerItem } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'

type Review = {
  id: string
  hall: string
  rating: number
  name: string
  occasion: string
  message: string
  at: string
}

/** Five stars, filled to the rating. Interactive when `onPick` is given. */
function Stars({
  value,
  onPick,
  size = 'sm',
}: {
  value: number
  onPick?: (next: number) => void
  size?: 'sm' | 'lg'
}) {
  const { t } = useLang()
  const box = size === 'lg' ? 'h-7 w-7' : 'h-4 w-4'

  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) =>
        onPick ? (
          <button
            key={star}
            type="button"
            onClick={() => onPick(star)}
            aria-label={`${star} ${t({ en: 'stars', ml: 'നക്ഷത്രങ്ങൾ' })}`}
            aria-pressed={value === star}
            className="rounded-sm p-1 transition-transform duration-200 hover:scale-110"
          >
            <Icon
              name="star"
              filled={star <= value}
              className={cn(box, star <= value ? 'text-gold-500' : 'text-[rgb(var(--line))]')}
            />
          </button>
        ) : (
          <Icon
            key={star}
            name="star"
            filled={star <= value}
            className={cn(box, star <= value ? 'text-gold-500' : 'text-[rgb(var(--line))]')}
          />
        ),
      )}
    </span>
  )
}

/**
 * What families say after their event, and a form to add to it. Reviews are
 * held until the parish office publishes them.
 */
export function HallReviews({ hall }: { hall: HallContent }) {
  const { t, lang } = useLang()

  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ hall: hall.halls[0]?.id ?? '', name: '', occasion: '', message: '' })
  const [rating, setRating] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/hall/reviews', { cache: 'no-store' })
      const json = await res.json()
      setReviews(Array.isArray(json.reviews) ? json.reviews : [])
    } catch {
      setReviews([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const nameOf = (id: string) => hall.halls.find((room) => room.id === id)?.name

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/hall/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rating }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not send the review')
      setStatus('sent')
      setRating(0)
      setForm({ hall: hall.halls[0]?.id ?? '', name: '', occasion: '', message: '' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the review')
      setStatus('error')
    }
  }

  const average = averageRating(reviews ?? [])

  return (
    <section id="reviews" className="section-tight bg-[rgb(var(--page-alt))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: 'After the event', ml: 'പരിപാടിക്ക് ശേഷം' }}
          title={{ en: 'What families say', ml: 'കുടുംബങ്ങൾ പറയുന്നത്' }}
          subtitle={{
            en: 'Reviews from parishioners who have used the halls. Each one is read at the parish office before it appears here.',
            ml: 'ഹാളുകൾ ഉപയോഗിച്ച ഇടവകാംഗങ്ങളുടെ അഭിപ്രായങ്ങൾ. ഓരോന്നും ഇവിടെ വരുന്നതിന് മുൻപ് ഇടവക ഓഫീസ് വായിക്കുന്നു.',
          }}
        />

        {reviews && reviews.length > 0 ? (
          <Reveal>
            <div className="mt-12 flex flex-col items-center gap-3">
              <Stars value={Math.round(average)} size="lg" />
              <p className="font-display text-3xl tabular-nums text-[rgb(var(--ink))]">
                {formatNumber(average, lang)}
                <span className="font-sans text-base text-[rgb(var(--muted))]"> / 5</span>
              </p>
              <p className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                {formatNumber(reviews.length, lang)}{' '}
                {t(
                  reviews.length === 1
                    ? { en: 'review', ml: 'അഭിപ്രായം' }
                    : { en: 'reviews', ml: 'അഭിപ്രായങ്ങൾ' },
                )}
              </p>
            </div>
          </Reveal>
        ) : null}

        {reviews === null ? (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-40 rounded-sm" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="mt-12 text-center font-serif text-lg italic text-[rgb(var(--muted))]">
            {t({
              en: 'No reviews yet. If you have held something in one of the halls, yours would be the first.',
              ml: 'ഇതുവരെ അഭിപ്രായങ്ങളൊന്നുമില്ല. ഹാളുകളിൽ ഒന്നിൽ എന്തെങ്കിലും നടത്തിയിട്ടുണ്ടെങ്കിൽ നിങ്ങളുടേതാകും ആദ്യത്തേത്.',
            })}
          </p>
        ) : (
          <StaggerGroup className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <motion.article key={review.id} variants={staggerItem} className="card flex flex-col p-7">
                <Stars value={review.rating} />
                <p className="mt-5 flex-1 font-serif text-lg italic leading-relaxed text-[rgb(var(--ink))]">
                  “{review.message}”
                </p>
                <p className="mt-6 font-sans text-sm text-[rgb(var(--ink))]">{review.name}</p>
                <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
                  {review.occasion ? `${review.occasion} · ` : ''}
                  {t(nameOf(review.hall) ?? { en: review.hall, ml: review.hall })}
                  {' · '}
                  {formatDate(review.at, lang, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </motion.article>
            ))}
          </StaggerGroup>
        )}

        <Reveal delay={0.1}>
          <div className="mx-auto mt-12 max-w-3xl">
            {!open ? (
              <div className="text-center">
                <button type="button" onClick={() => setOpen(true)} className="btn-outline">
                  {t({ en: 'Write a review', ml: 'ഒരു അഭിപ്രായം എഴുതുക' })}
                  <Icon name="quote" className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="card p-7 sm:p-9">
                <p className="eyebrow">{t({ en: 'Your review', ml: 'നിങ്ങളുടെ അഭിപ്രായം' })}</p>

                <div className="mt-6 flex flex-wrap items-center gap-6">
                  <label className="flex flex-col gap-2">
                    <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                      {t({ en: 'Rating', ml: 'റേറ്റിംഗ്' })}
                    </span>
                    <Stars value={rating} onPick={setRating} size="lg" />
                  </label>

                  <label className="flex min-w-[12rem] flex-1 flex-col gap-2">
                    <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                      {t({ en: 'Which hall', ml: 'ഏത് ഹാൾ' })}
                    </span>
                    <select
                      value={form.hall}
                      onChange={(e) => setForm({ ...form, hall: e.target.value })}
                      className="field"
                    >
                      {hall.halls.map((room) => (
                        <option key={room.id} value={room.id}>
                          {t(room.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                      {t({ en: 'Your name', ml: 'നിങ്ങളുടെ പേര്' })}
                    </span>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="field"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                      {t({ en: 'The occasion', ml: 'അവസരം' })}
                    </span>
                    <input
                      value={form.occasion}
                      onChange={(e) => setForm({ ...form, occasion: e.target.value })}
                      placeholder={t({ en: 'Wedding reception, meeting…', ml: 'വിവാഹ സ്വീകരണം, യോഗം…' })}
                      className="field"
                    />
                  </label>
                </div>

                <label className="mt-5 flex flex-col gap-2">
                  <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                    {t({ en: 'How was it?', ml: 'എങ്ങനെയുണ്ടായിരുന്നു?' })}
                  </span>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="field resize-y"
                    required
                  />
                </label>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="font-sans text-2xs text-[rgb(var(--muted))]">
                    {t({
                      en: 'Your review reaches the parish office first and appears here once published.',
                      ml: 'നിങ്ങളുടെ അഭിപ്രായം ആദ്യം ഇടവക ഓഫീസിൽ എത്തും, പ്രസിദ്ധീകരിച്ചാൽ ഇവിടെ കാണാം.',
                    })}
                  </p>
                  <button type="submit" disabled={status === 'sending'} className="btn-primary">
                    {status === 'sending'
                      ? t({ en: 'Sending…', ml: 'അയയ്ക്കുന്നു…' })
                      : t({ en: 'Send the review', ml: 'അഭിപ്രായം അയയ്ക്കുക' })}
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </button>
                </div>

                {status === 'sent' ? (
                  <p className="mt-5 rounded-sm border border-gold-400/40 bg-gold-400/10 p-4 font-sans text-sm text-[rgb(var(--ink))]">
                    {t({
                      en: 'Thank you — the parish office has your review and will publish it shortly.',
                      ml: 'നന്ദി — നിങ്ങളുടെ അഭിപ്രായം ഇടവക ഓഫീസിൽ എത്തി, ഉടൻ പ്രസിദ്ധീകരിക്കും.',
                    })}
                  </p>
                ) : null}

                {status === 'error' && error ? (
                  <p className="mt-5 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
                    {error}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
