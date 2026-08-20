import path from 'node:path'

import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { currentSession, isAuthenticated } from '@/lib/auth'
import { readRecords, writeJson } from '@/lib/content'
import type { HallReview } from '@/lib/hall'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FILE = path.join(process.cwd(), 'content', 'hall-reviews.json')
const STATUSES = new Set(['pending', 'published', 'hidden'])

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const reviews = (await readRecords('hall-reviews')) as HallReview[]
  return NextResponse.json({ reviews }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Publish a review, hide it again, or send it back to the queue. */
export async function PATCH(request: Request) {
  const session = await currentSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let id = ''
  let status = ''
  try {
    const body = await request.json()
    id = String(body?.id ?? '')
    status = String(body?.status ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!id || !STATUSES.has(status)) {
    return NextResponse.json({ error: 'Need a review id and a status' }, { status: 422 })
  }

  const reviews = (await readRecords('hall-reviews')) as HallReview[]
  const review = reviews.find((entry) => entry.id === id)
  if (!review) return NextResponse.json({ error: 'No such review' }, { status: 404 })

  review.status = status as HallReview['status']
  review.decidedAt = new Date().toISOString()

  await writeJson(FILE, reviews)
  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'review-decide',
    target: review.id,
    detail: `${review.hall} by ${review.name} -> ${status}`,
  })

  return NextResponse.json({ ok: true, review })
}

/** Remove a review outright — for anything that should never have been sent. */
export async function DELETE(request: Request) {
  const session = await currentSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let id = ''
  try {
    id = String((await request.json())?.id ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!id) return NextResponse.json({ error: 'Need a review id' }, { status: 422 })

  const reviews = (await readRecords('hall-reviews')) as HallReview[]
  const gone = reviews.find((entry) => entry.id === id)
  const left = reviews.filter((entry) => entry.id !== id)
  if (left.length === reviews.length) {
    return NextResponse.json({ error: 'No such review' }, { status: 404 })
  }

  await writeJson(FILE, left)
  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'review-delete',
    target: id,
    detail: gone ? `${gone.hall} by ${gone.name}` : undefined,
  })

  return NextResponse.json({ ok: true })
}
