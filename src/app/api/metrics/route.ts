import { NextResponse } from 'next/server'

import { countView, tidyPath, tidyReferrer } from '@/lib/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * One page view. Sent by the small script in the layout, kept only as a number
 * in that day's column — no cookie is set, no address is stored, and nothing
 * here can be traced back to a reader.
 */

const seen = new Map<string, { count: number; until: number }>()
const WINDOW = 60 * 60 * 1000
const LIMIT = 300

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

  // Answer the same way either way: a counter is not worth telling a flooder
  // anything about, and the browser has nothing useful to do with the reply.
  if (throttled(ip)) return new NextResponse(null, { status: 204 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 204 })
  }

  const path = tidyPath(String(body?.path ?? ''))
  if (!path) return new NextResponse(null, { status: 204 })

  countView({
    path,
    referrer: tidyReferrer(String(body?.referrer ?? ''), new URL(request.url).hostname),
    first: body?.first === true,
  })

  return new NextResponse(null, { status: 204 })
}
