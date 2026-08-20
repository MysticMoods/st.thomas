import { NextResponse } from 'next/server'

import { appendRecord, readContent, readRecords } from '@/lib/content'
import type { HallReview } from '@/lib/hall'
import type { HallContent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX = { name: 80, occasion: 120, message: 1200 }
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F]+', 'g')

/** Six reviews an hour from one address; HALL_REVIEW_LIMIT overrides it. */
const attempts = new Map<string, { count: number; until: number }>()
const WINDOW = 60 * 60 * 1000
const LIMIT = Number(process.env.HALL_REVIEW_LIMIT) || 6

function throttled(ip: string) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.until < now) {
    attempts.set(ip, { count: 1, until: now + WINDOW })
    return false
  }
  entry.count += 1
  return entry.count > LIMIT
}

function clean(value: unknown, limit: number) {
  return String(value ?? '')
    .replace(CONTROL_CHARS, ' ')
    .trim()
    .slice(0, limit)
}

/** Published reviews only, and never the moderation state of the rest. */
export async function GET() {
  const reviews = (await readRecords('hall-reviews')) as HallReview[]
  const published = reviews
    .filter((review) => review.status === 'published')
    .map(({ id, hall, rating, name, occasion, message, at }) => ({
      id,
      hall,
      rating,
      name,
      occasion,
      message,
      at,
    }))

  return NextResponse.json({ reviews: published }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'

  if (throttled(ip)) {
    return NextResponse.json(
      { error: 'Several reviews have come from here already. Please ring the parish office.' },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const hall = await readContent<HallContent>('hall')
  const hallId = clean(body.hall, 40)
  const rating = Math.round(Number(body.rating) || 0)

  const record: HallReview = {
    id: `hr${Date.now().toString(36)}`,
    hall: hallId,
    rating,
    name: clean(body.name, MAX.name),
    occasion: clean(body.occasion, MAX.occasion),
    message: clean(body.message, MAX.message),
    // Nothing appears on the page until the office publishes it.
    status: 'pending',
    at: new Date().toISOString(),
  }

  if (!hall.halls.some((room) => room.id === hallId)) {
    return NextResponse.json({ error: 'Choose which hall you used.' }, { status: 422 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Give the hall a rating from one to five.' }, { status: 422 })
  }
  if (!record.name || record.message.length < 10) {
    return NextResponse.json(
      { error: 'A name and a sentence or two about the hall are needed.' },
      { status: 422 },
    )
  }

  await appendRecord('hall-reviews', record)
  return NextResponse.json({ ok: true, id: record.id })
}
