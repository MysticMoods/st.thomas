import { NextResponse } from 'next/server'

import { recordFault } from '@/lib/report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * A fault a visitor's browser hit. Sent by the error boundary, and by the small
 * listener in the layout. Kept short and rate limited: this is a note for the
 * parish office, not a crash reporting service.
 */

const seen = new Map<string, { count: number; until: number }>()
const WINDOW = 60 * 60 * 1000
const LIMIT = 20

function throttled(ip: string) {
  const now = Date.now()
  const entry = seen.get(ip)
  if (!entry || entry.until < now) {
    seen.set(ip, { count: 1, until: now + WINDOW })
    return false
  }
  entry.count += 1
  return entry.count > LIMIT
}

export async function POST(request: Request) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'

  if (throttled(ip)) return new NextResponse(null, { status: 204 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  await recordFault({
    scope: 'browser',
    message: body?.message,
    where: String(body?.where ?? ''),
    detail: body?.detail,
  })

  return new NextResponse(null, { status: 204 })
}
