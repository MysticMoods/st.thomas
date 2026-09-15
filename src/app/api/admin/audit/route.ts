import { NextResponse } from 'next/server'

import { readAudit } from '@/lib/audit'
import { requireArea } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The activity log, newest first, optionally narrowed to one person or action. */
export async function GET(request: Request) {
  if (!(await requireArea('system'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const url = new URL(request.url)
  const actor = (url.searchParams.get('actor') ?? '').trim().toLowerCase()
  const action = (url.searchParams.get('action') ?? '').trim()
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 200))

  const all = await readAudit()
  const entries = all
    .filter((entry) => (!actor || entry.actor === actor) && (!action || entry.action === action))
    .slice(0, limit)

  return NextResponse.json(
    {
      entries,
      total: all.length,
      actors: [...new Set(all.map((entry) => entry.actor))].sort(),
      actions: [...new Set(all.map((entry) => entry.action))].sort(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
