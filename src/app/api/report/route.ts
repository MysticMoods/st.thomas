import { NextResponse } from 'next/server'

import { throttled } from '@/lib/limit'

import { recordFault } from '@/lib/report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * A fault a visitor's browser hit. Sent by the error boundary, and by the small
 * listener in the layout. Kept short and rate limited: this is a note for the
 * parish office, not a crash reporting service.
 */

const WINDOW = 60 * 60 * 1000
const LIMIT = 20

export async function POST(request: Request) {
  if (throttled(request, 'report', LIMIT, WINDOW)) return new NextResponse(null, { status: 204 })

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
