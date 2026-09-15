import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { requireArea } from '@/lib/auth'
import { readRecords, updateRecords } from '@/lib/content'
import type { HallReview } from '@/lib/hall'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = new Set(['pending', 'published', 'hidden'])

export async function GET() {
  if (!(await requireArea('hall'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const reviews = (await readRecords('hall-reviews')) as HallReview[]
  return NextResponse.json({ reviews }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Publish a review, hide it again, or send it back to the queue. */
export async function PATCH(request: Request) {
  const session = await requireArea('hall')
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

  // One operation, through the store: a review sent while this one is being
  // decided is no longer lost, and the write lands wherever the records live.
  let review: HallReview | undefined
  await updateRecords<HallReview>('hall-reviews', (all) => {
    review = all.find((entry) => entry.id === id)
    if (!review) return all
    review.status = status as HallReview['status']
    review.decidedAt = new Date().toISOString()
    return all
  })
  if (!review) return NextResponse.json({ error: 'No such review' }, { status: 404 })
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
  const session = await requireArea('hall')
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

  let gone: HallReview | undefined
  await updateRecords<HallReview>('hall-reviews', (all) => {
    gone = all.find((entry) => entry.id === id)
    return gone ? all.filter((entry) => entry.id !== id) : all
  })
  if (!gone) return NextResponse.json({ error: 'No such review' }, { status: 404 })
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
