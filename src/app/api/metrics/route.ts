import { NextResponse } from 'next/server'

import { throttled } from '@/lib/limit'

import { countView, tidyPath, tidyReferrer } from '@/lib/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * One page view. Sent by the small script in the layout, kept only as a number
 * in that day's column — no cookie is set, no address is stored, and nothing
 * here can be traced back to a reader.
 */

const WINDOW = 60 * 60 * 1000
const LIMIT = 300

export async function POST(request: Request) {
  // Answer the same way either way: a counter is not worth telling a flooder
  // anything about, and the browser has nothing useful to do with the reply.
  if (throttled(request, 'metrics', LIMIT, WINDOW)) return new NextResponse(null, { status: 204 })

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
