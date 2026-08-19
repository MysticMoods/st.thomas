import { NextResponse } from 'next/server'

import { readContent } from '@/lib/content'
import { bookingWindow } from '@/lib/hall'
import { readCalendar } from '@/lib/hall-server'
import type { HallContent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Which sessions are taken, and nothing else. Names, phone numbers and the
 * purpose of somebody's wedding stay in the dashboard.
 */
export async function GET() {
  const hall = await readContent<HallContent>('hall')
  const calendar = await readCalendar(hall)
  const window = bookingWindow(hall)

  const reasons: Record<string, string> = {}
  for (const day of hall.blocked) reasons[day.date] = day.reason.en

  return NextResponse.json({ calendar, window, blocked: hall.blocked }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
