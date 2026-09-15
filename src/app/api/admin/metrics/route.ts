import { NextResponse } from 'next/server'

import { requireArea } from '@/lib/auth'
import { flush, readAnalytics, recentDays, totals } from '@/lib/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** How much the site is being read, for the dashboard. */
export async function GET(request: Request) {
  if (!(await requireArea('system'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Views gathered in the last few seconds have not been written yet.
  await flush()

  const days = Math.min(180, Math.max(7, Number(new URL(request.url).searchParams.get('days')) || 30))
  const data = await readAnalytics()

  return NextResponse.json(
    { days: recentDays(data, days), ...totals(data), keptDays: Object.keys(data.days).length },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
