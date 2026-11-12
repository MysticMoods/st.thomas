import { NextResponse } from 'next/server'

import { requireArea } from '@/lib/auth'
import { readRecords } from '@/lib/content'

export const runtime = 'nodejs'

export async function GET() {
  if (!(await requireArea('messages'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [messages, donations] = await Promise.all([
    readRecords('messages'),
    readRecords('donations'),
  ])

  return NextResponse.json({
    messages: messages.slice(0, 100),
    donations: donations.slice(0, 500),
  })
}
